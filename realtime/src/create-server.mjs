import { createServer } from "node:http";
import { Server } from "socket.io";
import { applyAuthoritativeMove, applyDisconnectForfeit, canUserMove } from "./engine/authoritative-engine.mjs";
import { LatencyMetrics } from "./metrics/latency-metrics.mjs";
import { createConsoleTelemetrySink } from "./observability/telemetry.mjs";
import { verifyRoomToken as defaultVerifyRoomToken } from "./auth/verify-token.mjs";
import { RoomManager } from "./rooms/room-manager.mjs";
import { RankedQueueManager } from "./ranked/queue-manager.mjs";
import {
  applyRankedTimeout,
  emitRankedTimeoutApplied,
  emitRankedTurnTimerUpdated,
  getTimeoutStrikes,
  isRankedSnapshot,
  resolveRankedTurnDeadline,
  withRankedRealtimeState,
} from "./ranked/runtime.mjs";
import { CONNECTION_STATE_STATUS, ONLINE_SOCKET_EVENT, PEER_CONNECTION_REASON } from "./socket-events.mjs";

const DEFAULT_FETCH_TIMEOUT_MS = 5_000;
const DEFAULT_FETCH_RETRIES = 2;
const DEFAULT_STALE_CLEANUP_INTERVAL_MS = 5 * 60_000;
const DEFAULT_STALE_ROOM_MS = 30 * 60_000;
const DEFAULT_STALE_MATCH_MS = 30 * 60_000;
async function requestWithRetry(params) {
  const {
    fetchImpl,
    telemetry,
    url,
    init,
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    retries = DEFAULT_FETCH_RETRIES,
    eventName,
  } = params;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error("Unknown request error");

      if (attempt < retries) {
        telemetry.trackEvent("internal_fetch.retrying", {
          eventName,
          attempt: attempt + 1,
          url,
          error: lastError.message,
        });
        continue;
      }
    }
  }

  telemetry.trackError("internal_fetch.failed", {
    eventName,
    url,
    error: lastError instanceof Error ? lastError.message : "Unknown request error",
  });
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

async function defaultCheckWebApiReady(params) {
  const { webApiUrl, fetchImpl, telemetry } = params;

  const response = await requestWithRetry({
    fetchImpl,
    telemetry,
    url: `${webApiUrl}/`,
    init: {
      method: "GET",
      cache: "no-store",
    },
    timeoutMs: 3_000,
    retries: 0,
    eventName: "web_api.readiness_check",
  });

  return response.status < 500;
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function defaultFetchers(params) {
  const { webApiUrl, internalSecret, telemetry, fetchImpl } = params;

  return {
    async fetchBootstrapSnapshot({ roomId, matchId }) {
      const response = await requestWithRetry({
        fetchImpl,
        telemetry,
        url: `${webApiUrl}/api/internal/realtime/bootstrap`,
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-realtime-internal-secret": internalSecret,
          },
          body: JSON.stringify({ roomId, matchId }),
        },
        eventName: "bootstrap.fetch",
      });

      const data = await response.json();
      return data.snapshot;
    },
    async persistMatchState({ roomId, matchId, snapshot, finished, endedBy }) {
      await requestWithRetry({
        fetchImpl,
        telemetry,
        url: `${webApiUrl}/api/internal/realtime/match-state`,
        init: {
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
            endedBy,
          }),
        },
        eventName: "match_state.persist",
      });
    },
    async hasPlayerLeftMatch({ roomId, userId }) {
      let response;
      try {
        response = await requestWithRetry({
          fetchImpl,
          telemetry,
          url: `${webApiUrl}/api/internal/realtime/member-state`,
          init: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-realtime-internal-secret": internalSecret,
            },
            body: JSON.stringify({ roomId, userId }),
          },
          eventName: "member_state.fetch",
        });
      } catch {
        return false;
      }

      const data = await response.json().catch(() => null);
      return Boolean(data?.left);
    },
    async fetchCurrentMatchId({ roomId }) {
      let response;
      try {
        response = await requestWithRetry({
          fetchImpl,
          telemetry,
          url: `${webApiUrl}/api/internal/realtime/current-match`,
          init: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-realtime-internal-secret": internalSecret,
            },
            body: JSON.stringify({ roomId }),
          },
          eventName: "current_match.fetch",
        });
      } catch {
        return null;
      }

      const data = await response.json().catch(() => null);
      return typeof data?.matchId === "string" ? data.matchId : null;
    },
    async createRankedMatch({ seat1UserId, seat2UserId }) {
      const response = await requestWithRetry({
        fetchImpl,
        telemetry,
        url: `${webApiUrl}/api/internal/realtime/ranked-match`,
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-realtime-internal-secret": internalSecret,
          },
          body: JSON.stringify({ seat1UserId, seat2UserId }),
        },
        eventName: "ranked_match.create",
      });

      return response.json();
    },
  };
}

function withDisconnectedConnectionState(snapshot, userId, disconnectedAt, reconnectDeadlineMs) {
  return {
    ...snapshot,
    connectionStates: {
      ...(snapshot.connectionStates || {}),
      [userId]: {
        status: CONNECTION_STATE_STATUS.DISCONNECTED,
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
  const rankedQueueManager = options.rankedQueueManager ?? new RankedQueueManager();
  const telemetry = options.telemetry ?? createConsoleTelemetrySink("realtime");
  const fetchImpl = options.fetchImpl ?? fetch;
  const moveLatencyMetrics =
    options.moveLatencyMetrics ?? new LatencyMetrics("move_submit_to_move_applied", 20, telemetry);
  const syncLatencyMetrics =
    options.syncLatencyMetrics ?? new LatencyMetrics("sync_request_to_sync_response", 20, telemetry);
  const fetchers =
    options.fetchers ?? defaultFetchers({ webApiUrl, internalSecret, telemetry, fetchImpl });
  const checkWebApiReady =
    options.checkWebApiReady ??
    (() => defaultCheckWebApiReady({ webApiUrl, fetchImpl, telemetry }));
  const staleCleanupIntervalMs = options.staleCleanupIntervalMs ?? DEFAULT_STALE_CLEANUP_INTERVAL_MS;
  const staleRoomMs = options.staleRoomMs ?? DEFAULT_STALE_ROOM_MS;
  const staleMatchMs = options.staleMatchMs ?? DEFAULT_STALE_MATCH_MS;
  const configValid = Boolean(origin && webApiUrl && internalSecret);
  const randomFn = options.randomFn ?? Math.random;
  const rankedTurnTimeouts = new Map();

  function clearRankedTurnTimeout(matchId) {
    const timeoutId = rankedTurnTimeouts.get(matchId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      rankedTurnTimeouts.delete(matchId);
    }
  }

  function isTurnPlayerDisconnected(roomId, snapshot) {
    if (!snapshot?.turnUserId) {
      return false;
    }

    const roomState = roomManager.rooms.get(roomId);
    const playerState = roomState?.players?.[snapshot.turnUserId];
    return Boolean(playerState?.disconnectedAt);
  }

  async function handleRankedTurnTimeout({ roomId, matchId }) {
    const snapshot = roomManager.getMatch(matchId);
    if (!snapshot || !isRankedSnapshot(snapshot) || snapshot.winner || !snapshot.turnUserId || !snapshot.currentRoll) {
      clearRankedTurnTimeout(matchId);
      return;
    }

    const deadlineMs = typeof snapshot.turnDeadlineMs === "number" ? snapshot.turnDeadlineMs : null;
    if (deadlineMs && deadlineMs > Date.now()) {
      scheduleRankedTurnTimeout({ roomId, matchId, snapshot });
      return;
    }

    const timeoutResult = applyRankedTimeout({
      snapshot,
      randomFn,
      applyAuthoritativeMove,
      isTurnPlayerDisconnected: isTurnPlayerDisconnected(roomId, snapshot),
      isNextTurnPlayerDisconnected: (nextSnapshot) => isTurnPlayerDisconnected(roomId, nextSnapshot),
    });

    if (!timeoutResult) {
      clearRankedTurnTimeout(matchId);
      return;
    }

    try {
      await fetchers.persistMatchState({
        roomId,
        matchId,
        snapshot: timeoutResult.snapshot,
        finished: Boolean(timeoutResult.snapshot.winner),
        endedBy: timeoutResult.endedBy,
      });
    } catch (error) {
      telemetry.trackError("ranked_timeout.persist_failed", {
        roomId,
        matchId,
        userId: timeoutResult.timedOutUserId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      scheduleRankedTurnTimeout({ roomId, matchId, snapshot });
      return;
    }

    roomManager.setMatch(matchId, timeoutResult.snapshot);
    emitRankedTimeoutApplied({
      io,
      roomId,
      matchId,
      timeoutResult,
    });

    if (timeoutResult.snapshot.winner) {
      clearRankedTurnTimeout(matchId);
      io.to(roomId).emit(ONLINE_SOCKET_EVENT.MATCH_FINISHED, {
        roomId,
        matchId,
        revision: timeoutResult.snapshot.revision,
        snapshot: timeoutResult.snapshot,
        endedBy: timeoutResult.endedBy,
      });
      return;
    }

    emitRankedTurnTimerUpdated({ io, roomId, matchId, snapshot: timeoutResult.snapshot });
    scheduleRankedTurnTimeout({ roomId, matchId, snapshot: timeoutResult.snapshot });
  }

  function scheduleRankedTurnTimeout({ roomId, matchId, snapshot }) {
    clearRankedTurnTimeout(matchId);

    if (!isRankedSnapshot(snapshot) || snapshot.winner || !snapshot.turnUserId || !snapshot.currentRoll) {
      return;
    }

    if (isTurnPlayerDisconnected(roomId, snapshot)) {
      return;
    }

    const deadlineMs =
      typeof snapshot.turnDeadlineMs === "number"
        ? snapshot.turnDeadlineMs
        : resolveRankedTurnDeadline({
            snapshot,
            isTurnPlayerDisconnected: isTurnPlayerDisconnected(roomId, snapshot),
          });
    if (deadlineMs === null) {
      return;
    }
    const timeoutMs = Math.max(0, deadlineMs - Date.now());
    const timeoutId = setTimeout(() => {
      void handleRankedTurnTimeout({ roomId, matchId });
    }, timeoutMs);
    timeoutId.unref?.();
    rankedTurnTimeouts.set(matchId, timeoutId);
  }

  const httpServer = createServer(async (request, response) => {
    if (!request.url) {
      response.writeHead(404).end();
      return;
    }

    if (request.url === "/ranked/queue" && (request.method === "POST" || request.method === "DELETE")) {
      const providedSecret = request.headers["x-realtime-internal-secret"];
      if (providedSecret !== internalSecret) {
        response.writeHead(403, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Forbidden" }));
        return;
      }

      const payload = await readJsonBody(request);
      const userId = typeof payload?.userId === "string" ? payload.userId : "";

      if (!userId) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Invalid payload" }));
        return;
      }

      if (request.method === "DELETE") {
        rankedQueueManager.dequeue(userId);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ searching: false }));
        return;
      }

      const mmr = typeof payload?.mmr === "number" ? payload.mmr : 0;
      rankedQueueManager.enqueue({ userId, mmr });
      const matched = rankedQueueManager.attemptMatch();

      if (!matched) {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ searching: true }));
        return;
      }

      try {
        const rankedMatch = await fetchers.createRankedMatch({
          seat1UserId: matched.seat1.userId,
          seat2UserId: matched.seat2.userId,
        });

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            searching: false,
            roomId: rankedMatch.roomId,
            matchId: rankedMatch.matchId,
          }),
        );
        return;
      } catch (error) {
        rankedQueueManager.enqueue(matched.seat1);
        rankedQueueManager.enqueue(matched.seat2);
        telemetry.trackError("ranked_matchmaking.create_failed", {
          seat1UserId: matched.seat1.userId,
          seat2UserId: matched.seat2.userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Failed to create ranked match" }));
        return;
      }
    }

    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          status: "ok",
          roomCount: roomManager.rooms.size,
          matchCount: roomManager.matches.size,
          rankedQueueSize: rankedQueueManager.size(),
        }),
      );
      return;
    }

    if (request.method === "GET" && request.url === "/ready") {
      let dependencyReady = false;
      let reason = null;

      if (!configValid) {
        reason = "Missing realtime configuration";
      } else {
        try {
          dependencyReady = await checkWebApiReady();
          if (!dependencyReady) {
            reason = "Web API readiness check returned unavailable";
          }
        } catch (error) {
          reason = error instanceof Error ? error.message : "Web API readiness check failed";
        }
      }

      const ready = configValid && dependencyReady;
      response.writeHead(ready ? 200 : 503, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          status: ready ? "ready" : "not_ready",
          configValid,
          dependencyReady,
          reason,
        }),
      );
      return;
    }

    response.writeHead(404).end();
  });
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
      telemetry.trackError("token.verify_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      next(error);
    }
  });

  const staleCleanupIntervalId = setInterval(() => {
    const result = roomManager.pruneStaleState({
      staleRoomMs,
      staleMatchMs,
    });

    if (result.removedRooms || result.removedMatches || result.removedMoveBuckets) {
      telemetry.trackEvent("memory_state.pruned", result);
    }
  }, staleCleanupIntervalMs);
  staleCleanupIntervalId.unref?.();

  async function finalizeDisconnectForfeit({ roomId, userId, endedBy = "DISCONNECT" }) {
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
        } catch (error) {
          telemetry.trackError("disconnect_forfeit.bootstrap_failed", {
            roomId,
            matchId,
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          snapshot = null;
        }
      }

      const forfeitedSnapshot = applyDisconnectForfeit({
        snapshot,
        disconnectedUserId: userId,
      });

      if (forfeitedSnapshot) {
        const endedSnapshot = isRankedSnapshot(forfeitedSnapshot)
          ? withRankedRealtimeState(forfeitedSnapshot, {
              turnDeadlineMs: null,
            })
          : forfeitedSnapshot;
        try {
          await fetchers.persistMatchState({
            roomId,
            matchId,
            snapshot: endedSnapshot,
            finished: true,
            endedBy,
          });
        } catch (error) {
          telemetry.trackError("disconnect_forfeit.persist_failed", {
            roomId,
            matchId,
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return;
        }

        clearRankedTurnTimeout(matchId);
        roomManager.setMatch(matchId, endedSnapshot);
        io.to(roomId).emit(ONLINE_SOCKET_EVENT.MATCH_FINISHED, {
          roomId,
          matchId,
          revision: endedSnapshot.revision,
          snapshot: endedSnapshot,
          endedBy,
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
        } catch (error) {
          telemetry.trackError("sync.bootstrap_failed", {
            roomId,
            matchId,
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          socket.emit(ONLINE_SOCKET_EVENT.ERROR, { message: "Unable to sync room state" });
          return;
        }
      }

      const reconnectState = snapshot.connectionStates && snapshot.connectionStates[userId];
      if (reconnectState?.status === CONNECTION_STATE_STATUS.DISCONNECTED) {
        let reconnectedSnapshot = withConnectedConnectionState(snapshot, userId);
        if (isRankedSnapshot(reconnectedSnapshot) && reconnectedSnapshot.turnDeadlineMs === null) {
          reconnectedSnapshot = withRankedRealtimeState(reconnectedSnapshot, {
            turnDeadlineMs: resolveRankedTurnDeadline({
              snapshot: reconnectedSnapshot,
              isTurnPlayerDisconnected: isTurnPlayerDisconnected(roomId, reconnectedSnapshot),
            }),
          });
        }
        try {
          await fetchers.persistMatchState({
            roomId,
            matchId,
            snapshot: reconnectedSnapshot,
            finished: false,
          });
          telemetry.trackEvent("reconnect_state.cleared", {
            roomId,
            matchId,
            userId,
          });
          snapshot = reconnectedSnapshot;
          roomManager.setMatch(matchId, snapshot);
        } catch (error) {
          telemetry.trackError("reconnect_state.persist_failed", {
            roomId,
            matchId,
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      if (isRankedSnapshot(snapshot)) {
        roomManager.setMatch(matchId, snapshot);
        emitRankedTurnTimerUpdated({ io, roomId, matchId, snapshot });
        scheduleRankedTurnTimeout({ roomId, matchId, snapshot });
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
      telemetry.trackEvent("sync.completed", {
        roomId,
        matchId,
        userId,
        revision: snapshot.revision,
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
        } catch (error) {
          telemetry.trackError("move.bootstrap_failed", {
            roomId,
            matchId,
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
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

      if (isRankedSnapshot(nextSnapshot)) {
        nextSnapshot = withRankedRealtimeState(nextSnapshot, {
          turnDeadlineMs:
            nextSnapshot.winner
              ? null
              : resolveRankedTurnDeadline({
                  snapshot: nextSnapshot,
                  isTurnPlayerDisconnected: isTurnPlayerDisconnected(roomId, nextSnapshot),
                }),
          timeoutStrikes: getTimeoutStrikes(snapshot),
        });
      }

      const naturalEndReason =
        nextSnapshot.winner === "draw" ? "DRAW" : nextSnapshot.winner ? "NORMAL" : undefined;

        try {
          await fetchers.persistMatchState({
            roomId,
            matchId,
            snapshot: nextSnapshot,
            finished: Boolean(nextSnapshot.winner),
            endedBy: naturalEndReason,
          });
          telemetry.trackEvent("match_state.persisted", {
            roomId,
            matchId,
            revision: nextSnapshot.revision,
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
        telemetry.trackError("match_state.persist_failed", {
          roomId,
          matchId,
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }

      roomManager.setMatch(matchId, nextSnapshot);
      roomManager.applyMove(roomId, userId, { matchId });
      if (isRankedSnapshot(nextSnapshot)) {
        if (nextSnapshot.winner) {
          clearRankedTurnTimeout(matchId);
        } else {
          scheduleRankedTurnTimeout({ roomId, matchId, snapshot: nextSnapshot });
        }
      }

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
          endedBy: naturalEndReason,
        });
      } else if (isRankedSnapshot(nextSnapshot)) {
        emitRankedTurnTimerUpdated({ io, roomId, matchId, snapshot: nextSnapshot });
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
          reason: PEER_CONNECTION_REASON.LEFT_MATCH,
          at: disconnectedAt,
          disconnectedAt,
        });
        void finalizeDisconnectForfeit({ roomId, userId, endedBy: "LEAVE" });
        return;
      }

      const matchId = state.matchId || roomManager.findMatchIdByRoomId(roomId);
      const snapshot = matchId ? roomManager.getMatch(matchId) : null;
      if (matchId && snapshot && !snapshot.winner) {
        let snapshotWithReconnectState = withDisconnectedConnectionState(
          snapshot,
          userId,
          disconnectedAt,
          graceEndsAt,
        );
        if (isRankedSnapshot(snapshotWithReconnectState) && snapshot.turnUserId === userId) {
          clearRankedTurnTimeout(matchId);
          snapshotWithReconnectState = withRankedRealtimeState(snapshotWithReconnectState, {
            turnDeadlineMs: null,
          });
        }

        try {
          await fetchers.persistMatchState({
            roomId,
            matchId,
            snapshot: snapshotWithReconnectState,
            finished: false,
          });
          telemetry.trackEvent("reconnect_state.persisted", {
            roomId,
            matchId,
            userId,
            graceEndsAt,
          });
          roomManager.setMatch(matchId, snapshotWithReconnectState);
        } catch (error) {
          telemetry.trackError("disconnect_state.persist_failed", {
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
        reason: PEER_CONNECTION_REASON.DISCONNECT,
        at: disconnectedAt,
        disconnectedAt,
        graceEndsAt,
      });
      io.to(roomId).emit(ONLINE_SOCKET_EVENT.ROOM_STATE, state);

      setTimeout(() => {
        const latest = roomManager.ensureRoom(roomId);
        const player = latest.players[userId];
        if (player && player.disconnectedAt && Date.now() - player.disconnectedAt >= gracePeriodMs) {
          void finalizeDisconnectForfeit({ roomId, userId, endedBy: "DISCONNECT" });
        }
      }, gracePeriodMs + 100);
    });
  });

  return {
    io,
    httpServer,
    roomManager,
    rankedQueueManager,
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
      clearInterval(staleCleanupIntervalId);
      for (const matchId of rankedTurnTimeouts.keys()) {
        clearRankedTurnTimeout(matchId);
      }
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
