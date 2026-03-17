function createEmptyState(roomId, matchId) {
  return {
    roomId,
    matchId,
    revision: 0,
    status: "waiting",
    players: {},
    currentTurnUserId: null,
    lastMoveAt: null,
    updatedAt: Date.now(),
  };
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.matches = new Map();
    this.matchTouchedAt = new Map();
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
    state.updatedAt = Date.now();
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
    state.updatedAt = Date.now();

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
      state.updatedAt = Date.now();
      return {
        state,
        fullyDisconnected: false,
      };
    }

    player.disconnectedAt = Date.now();
    state.revision += 1;
    state.updatedAt = Date.now();
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
    state.updatedAt = Date.now();
    return state;
  }

  getMatch(matchId) {
    return this.matches.get(matchId) ?? null;
  }

  setMatch(matchId, snapshot) {
    this.matches.set(matchId, snapshot);
    this.matchTouchedAt.set(matchId, Date.now());
    if (snapshot?.roomId) {
      this.ensureRoom(snapshot.roomId, matchId);
    }
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

  pruneStaleState(params = {}) {
    const now = params.now ?? Date.now();
    const staleRoomMs = params.staleRoomMs ?? 30 * 60_000;
    const staleMatchMs = params.staleMatchMs ?? 30 * 60_000;
    let removedRooms = 0;
    let removedMatches = 0;
    let removedMoveBuckets = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      const hasConnectedPlayers = Object.values(room.players).some((player) => player.socketIds.length > 0);
      const staleSince = room.updatedAt ?? room.lastMoveAt ?? 0;
      if (hasConnectedPlayers || now - staleSince < staleRoomMs) {
        continue;
      }

      this.rooms.delete(roomId);
      removedRooms += 1;
    }

    for (const [matchId, snapshot] of this.matches.entries()) {
      const touchedAt = this.matchTouchedAt.get(matchId) ?? 0;
      const relatedRoom = snapshot?.roomId ? this.rooms.get(snapshot.roomId) : null;
      const roomStillActive = relatedRoom
        ? Object.values(relatedRoom.players).some((player) => player.socketIds.length > 0)
        : false;
      const finished = Boolean(snapshot?.winner);

      if ((roomStillActive || !finished) && now - touchedAt < staleMatchMs) {
        continue;
      }

      if (roomStillActive) {
        continue;
      }

      if (now - touchedAt < staleMatchMs) {
        continue;
      }

      this.matches.delete(matchId);
      this.matchTouchedAt.delete(matchId);
      removedMatches += 1;
    }

    for (const [userId, bucket] of this.moveBuckets.entries()) {
      if (bucket.resetAt > now) {
        continue;
      }

      this.moveBuckets.delete(userId);
      removedMoveBuckets += 1;
    }

    return {
      removedRooms,
      removedMatches,
      removedMoveBuckets,
    };
  }
}
