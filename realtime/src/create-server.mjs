import { createServer } from "node:http";
import { Server } from "socket.io";
import { applyAuthoritativeMove, applyDisconnectForfeit, canUserMove } from "./engine/authoritative-engine.mjs";
import { LatencyMetrics } from "./metrics/latency-metrics.mjs";
import { verifyRoomToken as defaultVerifyRoomToken } from "./auth/verify-token.mjs";
import { RoomManager } from "./rooms/room-manager.mjs";
import { ONLINE_SOCKET_EVENT } from "./socket-events.mjs";

function defaultFetchers(params) {
  const { webApiUrl, internalSecret } = params;

  return {
    async fetchBootstrapSnapshot({ roomId, matchId }) {
      const response = await fetch(`${webApiUrl}/api/internal/realtime/bootstrap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-realtime-internal-secret": internalSecret,
        },
        body: JSON.stringify({ roomId, matchId }),
      });
      if (!response.ok) {
        throw new Error("Bootstrap failed");
      }

      const data = await response.json();
      return data.snapshot;
    },
    async persistMatchState({ roomId, matchId, snapshot, finished }) {
      const response = await fetch(`${webApiUrl}/api/internal/realtime/match-state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-realtime-internal-secret": internalSecret,
        },
        body: JSON.stringify({
          roomId,
          matchId,
          snapshot,
          finished,
        }),
      }).catch((error) => {
        throw new Error(error instanceof Error ? error.message : "Persist request failed");
      });

      if (!response.ok) {
        throw new Error(`Persist failed with status ${response.status}`);
      }
    },
    async hasPlayerLeftMatch({ roomId, userId }) {
      const response = await fetch(`${webApiUrl}/api/internal/realtime/member-state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-realtime-internal-secret": internalSecret,
        },
        body: JSON.stringify({ roomId, userId }),
      }).catch(() => null);

      if (!response || !response.ok) {
        return false;
      }

      const data = await response.json().catch(() => null);
      return Boolean(data?.left);
    },
    async fetchCurrentMatchId({ roomId }) {
      const response = await fetch(`${webApiUrl}/api/internal/realtime/current-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-realtime-internal-secret": internalSecret,
        },
        body: JSON.stringify({ roomId }),
      }).catch(() => null);

      if (!response || !response.ok) {
        return null;
      }

      const data = await response.json().catch(() => null);
      return typeof data?.matchId === "string" ? data.matchId : null;
    },
  };
}

function withDisconnectedConnectionState(snapshot, userId, disconnectedAt, reconnectDeadlineMs) {
  return {
    ...snapshot,
    connectionStates: {
      ...(snapshot.connectionStates || {}),
      [userId]: {
        status: "disconnected",
        disconnectedAt,
        reconnectDeadlineMs,
      },
    },
  };
}

function withConnectedConnectionState(snapshot, userId) {
  const nextConnectionStates = {
    ...(snapshot.connectionStates || {}),
  };
  delete nextConnectionStates[userId];

  return {
    ...snapshot,
    connectionStates: nextConnectionStates,
  };
}

export function createRealtimeServer(options = {}) {
  const origin = options.origin ?? process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const gracePeriodMs = options.gracePeriodMs ?? Number(process.env.REALTIME_GRACE_PERIOD_MS || 60_000);
  const webApiUrl = options.webApiUrl ?? process.env.WEB_API_URL ?? "http://localhost:3000";
  const internalSecret =
    options.internalSecret ?? process.env.REALTIME_INTERNAL_SECRET ?? "dev-realtime-internal-secret";
  const verifyRoomToken = options.verifyRoomToken ?? defaultVerifyRoomToken;
  const roomManager = options.roomManager ?? new RoomManager();
  const moveLatencyMetrics =
    options.moveLatencyMetrics ?? new LatencyMetrics("move_submit_to_move_applied");
  const syncLatencyMetrics =
    options.syncLatencyMetrics ?? new LatencyMetrics("sync_request_to_sync_response");
  const fetchers = options.fetchers ?? defaultFetchers({ webApiUrl, internalSecret });

  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token || typeof token !== "string") {
        throw new Error("Missing token");
      }
      const auth = verifyRoomToken(token);
      socket.data.userId = auth.userId;
      socket.data.roomId = auth.roomId;
      next();
    } catch (error) {
      next(error);
    }
  });

  async function finalizeDisconnectForfeit({ roomId, userId }) {
    const latest = roomManager.ensureRoom(roomId);
    const fallbackMatchId = roomManager.findMatchIdByRoomId(roomId);
    const dbMatchId = await fetchers.fetchCurrentMatchId({ roomId });
    const matchId = latest.matchId || fallbackMatchId || dbMatchId;

    if (matchId) {
      let snapshot = roomManager.getMatch(matchId);
      if (!snapshot) {
        try {
          snapshot = await fetchers.fetchBootstrapSnapshot({ roomId, matchId });
          roomManager.setMatch(matchId, snapshot);
        } catch {
          snapshot = null;
        }
      }

      const forfeitedSnapshot = applyDisconnectForfeit({
        snapshot,
        disconnectedUserId: userId,
      });

      if (forfeitedSnapshot) {
        try {
          await fetchers.persistMatchState({
            roomId,
            matchId,
            snapshot: forfeitedSnapshot,
            finished: true,
          });
        } catch (error) {
          console.error("[realtime:disconnect_forfeit_persist_failed]", {
            roomId,
            matchId,
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return;
        }

        roomManager.setMatch(matchId, forfeitedSnapshot);
        io.to(roomId).emit(ONLINE_SOCKET_EVENT.MATCH_FINISHED, {
          roomId,
          matchId,
          revision: forfeitedSnapshot.revision,
          snapshot: forfeitedSnapshot,
        });
      }
    }

    delete latest.players[userId];
    latest.revision += 1;
    io.to(roomId).emit(ONLINE_SOCKET_EVENT.ROOM_STATE, latest);
  }

  function makeMoveRejectedPayload(params) {
    return {
      roomId: params.roomId,
      matchId: params.matchId,
      reason: params.reason,
      expectedRevision: params.expectedRevision,
      currentRevision: params.currentRevision,
      clientMoveId: params.clientMoveId || "",
    };
  }

  io.on("connection", (socket) => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;

    socket.join(roomId);
    const { state: connectState, transitionedToConnected } = roomManager.connectPlayer(roomId, userId, socket.id);
    if (transitionedToConnected) {
      io.to(roomId).emit(ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE, {
        roomId,
        userId,
        connected: true,
        at: Date.now(),
        disconnectedAt: null,
        graceEndsAt: null,
      });
      io.to(roomId).emit(ONLINE_SOCKET_EVENT.ROOM_STATE, connectState);
    }

    socket.on(ONLINE_SOCKET_EVENT.SYNC_REQUEST, async (payload) => {
      const startedAt = Date.now();
      const matchId = payload && typeof payload.matchId === "string" ? payload.matchId : null;
      const lastSeenRevision =
        payload && typeof payload.lastSeenRevision === "number" ? payload.lastSeenRevision : 0;
      if (!matchId) {
        socket.emit(ONLINE_SOCKET_EVENT.ERROR, { message: "Missing matchId" });
        return;
      }
      if (await fetchers.hasPlayerLeftMatch({ roomId, userId })) {
        socket.emit(ONLINE_SOCKET_EVENT.ERROR, { message: "You are no longer a member of this room" });
        socket.disconnect(true);
        return;
      }
      roomManager.ensureRoom(roomId, matchId);

      let snapshot = roomManager.getMatch(matchId);
      if (!snapshot) {
        try {
          snapshot = await fetchers.fetchBootstrapSnapshot({ roomId, matchId });
          roomManager.setMatch(matchId, snapshot);
        } catch {
          socket.emit(ONLINE_SOCKET_EVENT.ERROR, { message: "Unable to sync room state" });
          return;
        }
      }

      const reconnectState = snapshot.connectionStates && snapshot.connectionStates[userId];
      if (reconnectState?.status === "disconnected") {
        const reconnectedSnapshot = withConnectedConnectionState(snapshot, userId);
        try {
          await fetchers.persistMatchState({
            roomId,
            matchId,
            snapshot: reconnectedSnapshot,
            finished: false,
          });
          snapshot = reconnectedSnapshot;
          roomManager.setMatch(matchId, snapshot);
        } catch (error) {
          console.error("[realtime:reconnect_state_persist_failed]", {
            roomId,
            matchId,
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const deltaEvents =
        snapshot.revision > lastSeenRevision ? [{ revision: snapshot.revision, type: "snapshot" }] : [];
      socket.emit(ONLINE_SOCKET_EVENT.SYNC_RESPONSE, {
        roomId,
        matchId,
        revision: snapshot.revision,
        snapshot,
        deltaEvents,
        serverRespondedAt: Date.now(),
      });
      syncLatencyMetrics.push(Date.now() - startedAt, {
        roomId,
        matchId,
        userId,
      });
    });

    socket.on(ONLINE_SOCKET_EVENT.MOVE_SUBMIT, async (payload) => {
      const serverReceivedAt = Date.now();
      const matchId = payload && typeof payload.matchId === "string" ? payload.matchId : null;
      const expectedRevision =
        payload && typeof payload.expectedRevision === "number" ? payload.expectedRevision : -1;
      const columnIndex = payload && typeof payload.columnIndex === "number" ? payload.columnIndex : -1;
      const clientMoveId = payload && typeof payload.clientMoveId === "string" ? payload.clientMoveId : "";

      if (!matchId || (columnIndex !== 0 && columnIndex !== 1 && columnIndex !== 2)) {
        socket.emit(
          ONLINE_SOCKET_EVENT.MOVE_REJECTED,
          makeMoveRejectedPayload({
            roomId,
            matchId: matchId || "",
            reason: "INVALID_PAYLOAD",
            expectedRevision,
            currentRevision: -1,
            clientMoveId,
          }),
        );
        return;
      }
      roomManager.ensureRoom(roomId, matchId);

      if (!roomManager.consumeMoveRateLimit(userId)) {
        socket.emit(
          ONLINE_SOCKET_EVENT.MOVE_REJECTED,
          makeMoveRejectedPayload({
            roomId,
            matchId,
            reason: "RATE_LIMIT",
            expectedRevision,
            currentRevision: roomManager.getMatch(matchId)?.revision ?? -1,
            clientMoveId,
          }),
        );
        return;
      }

      let snapshot = roomManager.getMatch(matchId);
      if (!snapshot) {
        try {
          snapshot = await fetchers.fetchBootstrapSnapshot({ roomId, matchId });
          roomManager.setMatch(matchId, snapshot);
        } catch {
          socket.emit(
            ONLINE_SOCKET_EVENT.MOVE_REJECTED,
            makeMoveRejectedPayload({
              roomId,
              matchId,
              reason: "INVALID_PAYLOAD",
              expectedRevision,
              currentRevision: -1,
              clientMoveId,
            }),
          );
          return;
        }
      }

      if (snapshot.revision !== expectedRevision) {
        socket.emit(
          ONLINE_SOCKET_EVENT.MOVE_REJECTED,
          makeMoveRejectedPayload({
            roomId,
            matchId,
            reason: "REVISION_MISMATCH",
            expectedRevision,
            currentRevision: snapshot.revision,
            clientMoveId,
          }),
        );
        return;
      }

      if (!canUserMove(snapshot, userId)) {
        socket.emit(
          ONLINE_SOCKET_EVENT.MOVE_REJECTED,
          makeMoveRejectedPayload({
            roomId,
            matchId,
            reason: "NOT_YOUR_TURN",
            expectedRevision,
            currentRevision: snapshot.revision,
            clientMoveId,
          }),
        );
        return;
      }

      let nextSnapshot;
      try {
        nextSnapshot = applyAuthoritativeMove({
          snapshot,
          userId,
          columnIndex,
        });
      } catch {
        socket.emit(
          ONLINE_SOCKET_EVENT.MOVE_REJECTED,
          makeMoveRejectedPayload({
            roomId,
            matchId,
            reason: "INVALID_COLUMN",
            expectedRevision,
            currentRevision: snapshot.revision,
            clientMoveId,
          }),
        );
        return;
      }

      try {
        await fetchers.persistMatchState({
          roomId,
          matchId,
          snapshot: nextSnapshot,
          finished: Boolean(nextSnapshot.winner),
        });
      } catch (error) {
        socket.emit(
          ONLINE_SOCKET_EVENT.MOVE_REJECTED,
          makeMoveRejectedPayload({
            roomId,
            matchId,
            reason: "PERSIST_FAILED",
            expectedRevision,
            currentRevision: snapshot.revision,
            clientMoveId,
          }),
        );
        console.error("[realtime:persist_failed]", {
          roomId,
          matchId,
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }

      roomManager.setMatch(matchId, nextSnapshot);
      roomManager.applyMove(roomId, userId, { matchId });

      const serverAppliedAt = Date.now();
      io.to(roomId).emit(ONLINE_SOCKET_EVENT.MOVE_APPLIED, {
        roomId,
        matchId,
        revision: nextSnapshot.revision,
        snapshot: nextSnapshot,
        clientMoveId,
        serverReceivedAt,
        serverAppliedAt,
      });

      if (nextSnapshot.winner) {
        io.to(roomId).emit(ONLINE_SOCKET_EVENT.MATCH_FINISHED, {
          roomId,
          matchId,
          revision: nextSnapshot.revision,
          snapshot: nextSnapshot,
        });
      }

      moveLatencyMetrics.push(serverAppliedAt - serverReceivedAt, {
        roomId,
        matchId,
        userId,
        revision: nextSnapshot.revision,
      });
    });

    socket.on("disconnect", async () => {
      const disconnectedAt = Date.now();
      const graceEndsAt = disconnectedAt + gracePeriodMs;
      const disconnectResult = roomManager.disconnectPlayer(roomId, userId, socket.id);
      if (!disconnectResult) {
        return;
      }

      const { state, fullyDisconnected } = disconnectResult;
      if (!fullyDisconnected) {
        return;
      }

      const leftIntentionally = await fetchers.hasPlayerLeftMatch({ roomId, userId });
      if (leftIntentionally) {
        io.to(roomId).emit(ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE, {
          roomId,
          userId,
          connected: false,
          reason: "left_match",
          at: disconnectedAt,
          disconnectedAt,
        });
        void finalizeDisconnectForfeit({ roomId, userId });
        return;
      }

      const matchId = state.matchId || roomManager.findMatchIdByRoomId(roomId);
      const snapshot = matchId ? roomManager.getMatch(matchId) : null;
      if (matchId && snapshot && !snapshot.winner) {
        const snapshotWithReconnectState = withDisconnectedConnectionState(
          snapshot,
          userId,
          disconnectedAt,
          graceEndsAt,
        );

        try {
          await fetchers.persistMatchState({
            roomId,
            matchId,
            snapshot: snapshotWithReconnectState,
            finished: false,
          });
          roomManager.setMatch(matchId, snapshotWithReconnectState);
        } catch (error) {
          console.error("[realtime:disconnect_state_persist_failed]", {
            roomId,
            matchId,
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      io.to(roomId).emit(ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE, {
        roomId,
        userId,
        connected: false,
        reason: "disconnect",
        at: disconnectedAt,
        disconnectedAt,
        graceEndsAt,
      });
      io.to(roomId).emit(ONLINE_SOCKET_EVENT.ROOM_STATE, state);

      setTimeout(() => {
        const latest = roomManager.ensureRoom(roomId);
        const player = latest.players[userId];
        if (player && player.disconnectedAt && Date.now() - player.disconnectedAt >= gracePeriodMs) {
          void finalizeDisconnectForfeit({ roomId, userId });
        }
      }, gracePeriodMs + 100);
    });
  });

  return {
    io,
    httpServer,
    roomManager,
    async listen(port, host = "127.0.0.1") {
      await new Promise((resolve, reject) => {
        httpServer.listen(port, host, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      return httpServer.address();
    },
    async close() {
      await new Promise((resolve, reject) => {
        io.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      if (!httpServer.listening) {
        return;
      }

      await new Promise((resolve, reject) => {
        httpServer.close((error) => {
          if (error && error.message !== "Server is not running.") {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
