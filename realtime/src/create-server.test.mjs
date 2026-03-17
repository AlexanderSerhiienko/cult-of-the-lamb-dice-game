import { createServer as createNetServer } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { io as createClient } from "socket.io-client";
import { createRealtimeServer } from "./create-server.mjs";
import { ONLINE_SOCKET_EVENT, PEER_CONNECTION_REASON } from "./socket-events.mjs";

const canBindTestPort = await new Promise((resolve) => {
  const server = createNetServer();

  server.once("error", () => {
    resolve(false);
  });

  server.listen(0, "127.0.0.1", () => {
    server.close(() => {
      resolve(true);
    });
  });
});

const itIfPortBindingAvailable = canBindTestPort ? it : it.skip;

function createSnapshot() {
  return {
    roomId: "room-1",
    matchId: "match-1",
    revision: 1,
    phase: "player_turn",
    currentRoll: 4,
    seat1Board: [[], [], []],
    seat2Board: [[], [], []],
    seatScores: { seat1: 0, seat2: 0 },
    winner: null,
    turnUserId: "u1",
    players: {
      seat1: "u1",
      seat2: "u2",
    },
  };
}

function waitForEvent(socket, eventName) {
  return new Promise((resolve) => {
    socket.once(eventName, resolve);
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}

describe("createRealtimeServer", () => {
  const resources = [];

  afterEach(async () => {
    while (resources.length > 0) {
      const cleanup = resources.pop();
      await cleanup();
    }
  });

  itIfPortBindingAvailable("does not forfeit when a player reconnects within the grace window", async () => {
    const snapshotStore = {
      current: createSnapshot(),
    };

    const server = createRealtimeServer({
      gracePeriodMs: 120,
      origin: "*",
      verifyRoomToken(token) {
        const [userId, roomId] = token.split(":");
        return { userId, roomId };
      },
      fetchers: {
        async fetchBootstrapSnapshot() {
          return snapshotStore.current;
        },
        async persistMatchState({ snapshot }) {
          snapshotStore.current = snapshot;
        },
        async hasPlayerLeftMatch() {
          return false;
        },
        async fetchCurrentMatchId() {
          return "match-1";
        },
      },
    });

    resources.push(async () => {
      await server.close();
    });

    const address = await server.listen(0);
    const port = typeof address === "object" && address ? address.port : 0;
    const url = `http://127.0.0.1:${port}`;

    const client1 = createClient(url, {
      transports: ["websocket"],
      auth: { token: "u1:room-1" },
    });
    const client2 = createClient(url, {
      transports: ["websocket"],
      auth: { token: "u2:room-1" },
    });

    resources.push(async () => {
      client1.disconnect();
      client2.disconnect();
    });

    await Promise.all([waitForEvent(client1, "connect"), waitForEvent(client2, "connect")]);

    client1.emit(ONLINE_SOCKET_EVENT.SYNC_REQUEST, {
      roomId: "room-1",
      matchId: "match-1",
      lastSeenRevision: 0,
    });
    client2.emit(ONLINE_SOCKET_EVENT.SYNC_REQUEST, {
      roomId: "room-1",
      matchId: "match-1",
      lastSeenRevision: 0,
    });

    await Promise.all([
      waitForEvent(client1, ONLINE_SOCKET_EVENT.SYNC_RESPONSE),
      waitForEvent(client2, ONLINE_SOCKET_EVENT.SYNC_RESPONSE),
    ]);

    const disconnectedEvent = waitForEvent(client2, ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE);
    client1.disconnect();
    const disconnectedPayload = await disconnectedEvent;
    expect(disconnectedPayload.reason).toBe(PEER_CONNECTION_REASON.DISCONNECT);

    const reconnectedClient1 = createClient(url, {
      transports: ["websocket"],
      auth: { token: "u1:room-1" },
    });
    resources.push(async () => {
      reconnectedClient1.disconnect();
    });

    await waitForEvent(reconnectedClient1, "connect");

    const reconnectedEvent = waitForEvent(client2, ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE);
    reconnectedClient1.emit(ONLINE_SOCKET_EVENT.SYNC_REQUEST, {
      roomId: "room-1",
      matchId: "match-1",
      lastSeenRevision: 0,
    });
    await waitForEvent(reconnectedClient1, ONLINE_SOCKET_EVENT.SYNC_RESPONSE);
    const reconnectedPayload = await reconnectedEvent;
    expect(reconnectedPayload.connected).toBe(true);

    let matchFinished = false;
    client2.once(ONLINE_SOCKET_EVENT.MATCH_FINISHED, () => {
      matchFinished = true;
    });

    await delay(260);
    expect(matchFinished).toBe(false);
    expect(snapshotStore.current.winner).toBeNull();
  });

  itIfPortBindingAvailable("finishes immediately when a player intentionally leaves", async () => {
    const snapshotStore = {
      current: createSnapshot(),
    };
    const leftUsers = new Set();

    const server = createRealtimeServer({
      gracePeriodMs: 120,
      origin: "*",
      verifyRoomToken(token) {
        const [userId, roomId] = token.split(":");
        return { userId, roomId };
      },
      fetchers: {
        async fetchBootstrapSnapshot() {
          return snapshotStore.current;
        },
        async persistMatchState({ snapshot }) {
          snapshotStore.current = snapshot;
        },
        async hasPlayerLeftMatch({ userId }) {
          return leftUsers.has(userId);
        },
        async fetchCurrentMatchId() {
          return "match-1";
        },
      },
    });

    resources.push(async () => {
      await server.close();
    });

    const address = await server.listen(0);
    const port = typeof address === "object" && address ? address.port : 0;
    const url = `http://127.0.0.1:${port}`;

    const client1 = createClient(url, {
      transports: ["websocket"],
      auth: { token: "u1:room-1" },
    });
    const client2 = createClient(url, {
      transports: ["websocket"],
      auth: { token: "u2:room-1" },
    });

    resources.push(async () => {
      client1.disconnect();
      client2.disconnect();
    });

    await Promise.all([waitForEvent(client1, "connect"), waitForEvent(client2, "connect")]);

    client1.emit(ONLINE_SOCKET_EVENT.SYNC_REQUEST, {
      roomId: "room-1",
      matchId: "match-1",
      lastSeenRevision: 0,
    });
    client2.emit(ONLINE_SOCKET_EVENT.SYNC_REQUEST, {
      roomId: "room-1",
      matchId: "match-1",
      lastSeenRevision: 0,
    });

    await Promise.all([
      waitForEvent(client1, ONLINE_SOCKET_EVENT.SYNC_RESPONSE),
      waitForEvent(client2, ONLINE_SOCKET_EVENT.SYNC_RESPONSE),
    ]);

    leftUsers.add("u1");

    const peerStateEvent = waitForEvent(client2, ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE);
    const finishedEvent = waitForEvent(client2, ONLINE_SOCKET_EVENT.MATCH_FINISHED);
    client1.disconnect();

    const peerStatePayload = await peerStateEvent;
    const finishedPayload = await finishedEvent;

    expect(peerStatePayload.reason).toBe(PEER_CONNECTION_REASON.LEFT_MATCH);
    expect(finishedPayload.snapshot.winner).toBe("seat2");
    expect(snapshotStore.current.winner).toBe("seat2");
  });

  itIfPortBindingAvailable("exposes health and readiness endpoints", async () => {
    const server = createRealtimeServer({
      origin: "*",
      verifyRoomToken(token) {
        const [userId, roomId] = token.split(":");
        return { userId, roomId };
      },
      checkWebApiReady: async () => true,
    });

    resources.push(async () => {
      await server.close();
    });

    const address = await server.listen(0);
    const port = typeof address === "object" && address ? address.port : 0;
    const url = `http://127.0.0.1:${port}`;

    const health = await fetchJson(`${url}/health`);
    const ready = await fetchJson(`${url}/ready`);

    expect(health.status).toBe(200);
    expect(health.body.status).toBe("ok");
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe("ready");
    expect(ready.body.configValid).toBe(true);
    expect(ready.body.dependencyReady).toBe(true);
  });
});
