function createEmptyState(roomId, matchId) {
  return {
    roomId,
    matchId,
    revision: 0,
    status: "waiting",
    players: {},
    currentTurnUserId: null,
    lastMoveAt: null,
  };
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.matches = new Map();
    this.moveBuckets = new Map();
  }

  ensureRoom(roomId, matchId = null) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, createEmptyState(roomId, matchId));
    }

    const state = this.rooms.get(roomId);
    if (matchId && !state.matchId) {
      state.matchId = matchId;
    }
    return state;
  }

  connectPlayer(roomId, userId, socketId) {
    const state = this.ensureRoom(roomId);
    const existingPlayer = state.players[userId];
    const wasDisconnected = !existingPlayer || existingPlayer.disconnectedAt !== null;
    const socketIds = existingPlayer?.socketIds ?? [];

    if (!socketIds.includes(socketId)) {
      socketIds.push(socketId);
    }

    state.players[userId] = {
      socketIds,
      connectedAt: wasDisconnected ? Date.now() : existingPlayer?.connectedAt ?? Date.now(),
      disconnectedAt: null,
    };

    if (wasDisconnected) {
      state.revision += 1;
    }

    return {
      state,
      transitionedToConnected: wasDisconnected,
    };
  }

  disconnectPlayer(roomId, userId, socketId) {
    const state = this.rooms.get(roomId);
    if (!state || !state.players[userId]) {
      return null;
    }

    const player = state.players[userId];
    player.socketIds = player.socketIds.filter((currentSocketId) => currentSocketId !== socketId);

    if (player.socketIds.length > 0) {
      return {
        state,
        fullyDisconnected: false,
      };
    }

    player.disconnectedAt = Date.now();
    state.revision += 1;
    return {
      state,
      fullyDisconnected: true,
    };
  }

  applyMove(roomId, userId, payload) {
    const state = this.ensureRoom(roomId, payload.matchId || null);
    state.status = "in_game";
    state.currentTurnUserId = userId;
    state.lastMoveAt = Date.now();
    state.revision += 1;
    return state;
  }

  getMatch(matchId) {
    return this.matches.get(matchId) ?? null;
  }

  setMatch(matchId, snapshot) {
    this.matches.set(matchId, snapshot);
  }

  findMatchIdByRoomId(roomId) {
    for (const [matchId, snapshot] of this.matches.entries()) {
      if (snapshot && snapshot.roomId === roomId) {
        return matchId;
      }
    }
    return null;
  }

  consumeMoveRateLimit(userId, limit = 20, windowMs = 10_000) {
    const now = Date.now();
    const existing = this.moveBuckets.get(userId);
    if (!existing || existing.resetAt <= now) {
      this.moveBuckets.set(userId, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    if (existing.count >= limit) {
      return false;
    }

    existing.count += 1;
    return true;
  }
}
