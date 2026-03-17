import { ONLINE_SOCKET_EVENT } from "../socket-events.mjs";

export const RANKED_TURN_TIMEOUT_MS = 15_000;
export const RANKED_TIMEOUT_STRIKE_LIMIT = 3;

export function isRankedSnapshot(snapshot) {
  return Boolean(snapshot?.isRanked);
}

export function getTimeoutStrikes(snapshot) {
  const seat1UserId = snapshot?.players?.seat1;
  const seat2UserId = snapshot?.players?.seat2;
  const existing = snapshot?.timeoutStrikes ?? {};

  return {
    ...(seat1UserId ? { [seat1UserId]: typeof existing[seat1UserId] === "number" ? existing[seat1UserId] : 0 } : {}),
    ...(seat2UserId ? { [seat2UserId]: typeof existing[seat2UserId] === "number" ? existing[seat2UserId] : 0 } : {}),
  };
}

export function withRankedRealtimeState(snapshot, updates = {}) {
  if (!isRankedSnapshot(snapshot)) {
    return snapshot;
  }

  return {
    ...snapshot,
    isRanked: true,
    turnDeadlineMs:
      Object.prototype.hasOwnProperty.call(updates, "turnDeadlineMs")
        ? updates.turnDeadlineMs
        : snapshot.turnDeadlineMs ?? null,
    timeoutStrikes: updates.timeoutStrikes ?? getTimeoutStrikes(snapshot),
  };
}

function getBoardForUser(snapshot, userId) {
  if (snapshot.players.seat1 === userId) {
    return snapshot.seat1Board;
  }

  if (snapshot.players.seat2 === userId) {
    return snapshot.seat2Board;
  }

  return null;
}

function getAvailableColumns(board) {
  const availableColumns = [];

  for (let index = 0; index < board.length; index += 1) {
    if (board[index].length < 3) {
      availableColumns.push(index);
    }
  }

  return availableColumns;
}

function resolveTimeoutWinner(snapshot, timedOutUserId) {
  return snapshot.players.seat1 === timedOutUserId ? "seat2" : "seat1";
}

export function resolveRankedTurnDeadline(params) {
  const {
    snapshot,
    isTurnPlayerDisconnected = false,
    now = Date.now(),
  } = params;

  if (!isRankedSnapshot(snapshot) || snapshot.winner || !snapshot.turnUserId || !snapshot.currentRoll) {
    return null;
  }

  if (isTurnPlayerDisconnected) {
    return null;
  }

  return now + RANKED_TURN_TIMEOUT_MS;
}

function resolveTimeoutEndReason(snapshot, reachedStrikeLimit) {
  if (reachedStrikeLimit) {
    return "TIMEOUT";
  }

  if (snapshot.winner === "draw") {
    return "DRAW";
  }

  if (snapshot.winner) {
    return "NORMAL";
  }

  return undefined;
}

export function applyRankedTimeout(params) {
  const {
    snapshot,
    randomFn,
    applyAuthoritativeMove,
    isTurnPlayerDisconnected = false,
    isNextTurnPlayerDisconnected = () => false,
  } = params;

  if (!isRankedSnapshot(snapshot) || snapshot.winner || !snapshot.turnUserId || !snapshot.currentRoll || isTurnPlayerDisconnected) {
    return null;
  }

  const timedOutUserId = snapshot.turnUserId;
  const timedOutBoard = getBoardForUser(snapshot, timedOutUserId);
  const availableColumns = timedOutBoard ? getAvailableColumns(timedOutBoard) : [];
  if (availableColumns.length === 0) {
    return null;
  }

  const columnIndex = availableColumns[Math.floor(randomFn() * availableColumns.length)];
  const timeoutStrikes = getTimeoutStrikes(snapshot);
  const strikeCount = (timeoutStrikes[timedOutUserId] ?? 0) + 1;
  const nextTimeoutStrikes = {
    ...timeoutStrikes,
    [timedOutUserId]: strikeCount,
  };

  let nextSnapshot = applyAuthoritativeMove({
    snapshot,
    userId: timedOutUserId,
    columnIndex,
  });

  const reachedStrikeLimit = strikeCount >= RANKED_TIMEOUT_STRIKE_LIMIT;
  if (reachedStrikeLimit) {
    nextSnapshot = withRankedRealtimeState(
      {
        ...nextSnapshot,
        phase: "finished",
        currentRoll: null,
        winner: resolveTimeoutWinner(snapshot, timedOutUserId),
        turnUserId: null,
      },
      {
        turnDeadlineMs: null,
        timeoutStrikes: nextTimeoutStrikes,
      },
    );
  } else {
    nextSnapshot = withRankedRealtimeState(nextSnapshot, {
      turnDeadlineMs: resolveRankedTurnDeadline({
        snapshot: nextSnapshot,
        isTurnPlayerDisconnected: isNextTurnPlayerDisconnected(nextSnapshot),
      }),
      timeoutStrikes: nextTimeoutStrikes,
    });
  }

  return {
    timedOutUserId,
    columnIndex,
    strikeCount,
    strikeLimit: RANKED_TIMEOUT_STRIKE_LIMIT,
    snapshot: nextSnapshot,
    endedBy: resolveTimeoutEndReason(nextSnapshot, reachedStrikeLimit),
  };
}

export function emitRankedTurnTimerUpdated(params) {
  const { io, roomId, matchId, snapshot } = params;

  if (!isRankedSnapshot(snapshot)) {
    return;
  }

  io.to(roomId).emit(ONLINE_SOCKET_EVENT.TURN_TIMER_UPDATED, {
    roomId,
    matchId,
    turnUserId: snapshot.turnUserId ?? null,
    turnDeadlineMs: snapshot.turnDeadlineMs ?? null,
  });
}

export function emitRankedTimeoutApplied(params) {
  const { io, roomId, matchId, timeoutResult, emittedAt = Date.now() } = params;

  io.to(roomId).emit(ONLINE_SOCKET_EVENT.TURN_TIMEOUT_APPLIED, {
    roomId,
    matchId,
    userId: timeoutResult.timedOutUserId,
    columnIndex: timeoutResult.columnIndex,
    strikeCount: timeoutResult.strikeCount,
    strikeLimit: timeoutResult.strikeLimit,
    revision: timeoutResult.snapshot.revision,
    snapshot: timeoutResult.snapshot,
  });
  io.to(roomId).emit(ONLINE_SOCKET_EVENT.MOVE_APPLIED, {
    roomId,
    matchId,
    revision: timeoutResult.snapshot.revision,
    snapshot: timeoutResult.snapshot,
    clientMoveId: "",
    serverReceivedAt: emittedAt,
    serverAppliedAt: emittedAt,
  });
}
