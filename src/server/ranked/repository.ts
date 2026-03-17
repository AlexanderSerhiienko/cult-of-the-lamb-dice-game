import { GameMatchEndReason, GameMatchEventType, GameMatchStatus, MatchMode, Prisma, RoomMemberRole, RoomStatus, RoomVisibility } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { createInitialOnlineSnapshot } from "@/server/rooms/authoritative-engine";
import { calculateRankedMmrDelta, getRankFromMmr } from "@/server/ranked/rating";
import { RANKED_MATCH_OUTCOME, type RankedMatchResultSummary } from "@/server/ranked/types";

const RANKED_TURN_TIMEOUT_MS = 15_000;

type RankedRealtimeSnapshotMeta = {
  winner?: unknown;
  phase?: unknown;
  connectionStates?: Record<string, { reconnectDeadlineMs?: unknown }>;
};

type RankedSessionLookup = {
  roomId: string;
  matchId: string;
  reconnectDeadlineMs: number | null;
};

type RankedParticipantWithProfile = {
  seat: 1 | 2;
  userId: string;
  user: {
    rankedMmr: number;
  };
};

type RankedParticipantResult = {
  userId: string;
  outcome: (typeof RANKED_MATCH_OUTCOME)[keyof typeof RANKED_MATCH_OUTCOME];
  mmrBefore: number;
  mmrAfter: number;
};

export async function findRankedProfileByUserId(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      rankedMmr: true,
      rankedWins: true,
      rankedLosses: true,
      rankedDraws: true,
    },
  });
}

function getOutcomeForSeat(params: {
  winner: "seat1" | "seat2" | "draw" | null;
  seat: 1 | 2;
}) {
  const { winner, seat } = params;

  if (winner === "draw" || winner === null) {
    return RANKED_MATCH_OUTCOME.DRAW;
  }

  if (winner === "seat1") {
    return seat === 1 ? RANKED_MATCH_OUTCOME.WIN : RANKED_MATCH_OUTCOME.LOSE;
  }

  return seat === 2 ? RANKED_MATCH_OUTCOME.WIN : RANKED_MATCH_OUTCOME.LOSE;
}

function generateInternalRankedCode() {
  return `RK${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function readRankedSnapshotMeta(snapshot: Prisma.JsonValue | null): RankedRealtimeSnapshotMeta | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  return snapshot as RankedRealtimeSnapshotMeta;
}

function isActiveRankedSnapshot(snapshot: Prisma.JsonValue | null) {
  const meta = readRankedSnapshotMeta(snapshot);

  if (!meta) {
    return false;
  }

  if (meta.winner !== null && meta.winner !== undefined) {
    return false;
  }

  return meta.phase !== "finished";
}

function getReconnectDeadlineMs(snapshot: Prisma.JsonValue | null, userId: string) {
  const reconnectDeadlineRaw = readRankedSnapshotMeta(snapshot)?.connectionStates?.[userId]?.reconnectDeadlineMs;

  if (typeof reconnectDeadlineRaw !== "number" || reconnectDeadlineRaw <= Date.now()) {
    return null;
  }

  return reconnectDeadlineRaw;
}

function buildRankedSessionLookup(params: {
  roomId: string;
  matchId: string;
  snapshot: Prisma.JsonValue | null;
  userId: string;
}): RankedSessionLookup | null {
  const { roomId, matchId, snapshot, userId } = params;

  if (!isActiveRankedSnapshot(snapshot)) {
    return null;
  }

  return {
    roomId,
    matchId,
    reconnectDeadlineMs: getReconnectDeadlineMs(snapshot, userId),
  };
}

function buildParticipantResult(params: {
  participant: RankedParticipantWithProfile;
  opponentMmr: number;
  winner: "seat1" | "seat2" | "draw" | null;
}): RankedParticipantResult {
  const { participant, opponentMmr, winner } = params;
  const outcome = getOutcomeForSeat({ winner, seat: participant.seat });
  const mmrBefore = participant.user.rankedMmr;
  const delta = calculateRankedMmrDelta({
    playerMmr: mmrBefore,
    opponentMmr,
    outcome,
  });

  return {
    userId: participant.userId,
    outcome,
    mmrBefore,
    mmrAfter: Math.max(0, mmrBefore + delta),
  };
}

export async function createRankedRoomAndMatch(params: {
  seat1UserId: string;
  seat2UserId: string;
}) {
  const { seat1UserId, seat2UserId } = params;

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.create({
      data: {
        code: generateInternalRankedCode(),
        visibility: RoomVisibility.RANKED,
        status: RoomStatus.IN_GAME,
        hostId: seat1UserId,
        members: {
          create: [
            {
              userId: seat1UserId,
              role: RoomMemberRole.HOST,
            },
            {
              userId: seat2UserId,
              role: RoomMemberRole.PLAYER,
            },
          ],
        },
      },
      select: { id: true },
    });

    const match = await tx.gameMatch.create({
      data: {
        roomId: room.id,
        mode: MatchMode.RANKED,
        status: GameMatchStatus.PENDING,
        participants: {
          create: [
            { userId: seat1UserId, seat: 1 },
            { userId: seat2UserId, seat: 2 },
          ],
        },
      },
      select: { id: true },
    });

    const baseSnapshot = createInitialOnlineSnapshot({
      roomId: room.id,
      matchId: match.id,
      seat1UserId,
      seat2UserId,
    });
    const snapshot = {
      ...baseSnapshot,
      isRanked: true,
      turnDeadlineMs: Date.now() + RANKED_TURN_TIMEOUT_MS,
      timeoutStrikes: {
        [seat1UserId]: 0,
        [seat2UserId]: 0,
      },
    };

    const serializedSnapshot = snapshot as Prisma.InputJsonValue;

    await tx.gameMatch.update({
      where: { id: match.id },
      data: {
        mode: MatchMode.RANKED,
        status: GameMatchStatus.ACTIVE,
        startedAt: new Date(),
        phase: snapshot.phase,
        currentRoll: snapshot.currentRoll ?? 1,
        revision: snapshot.revision,
        snapshot: serializedSnapshot,
        events: {
          create: {
            seq: 1,
            eventType: GameMatchEventType.MATCH_STARTED,
            payload: serializedSnapshot,
          },
        },
      },
    });

    await tx.room.update({
      where: { id: room.id },
      data: {
        currentMatchId: match.id,
        status: RoomStatus.IN_GAME,
      },
    });

    return {
      roomId: room.id,
      matchId: match.id,
      snapshot,
    };
  });
}

export async function findActiveRankedMatchForUser(userId: string): Promise<RankedSessionLookup | null> {
  const membership = await prisma.roomMember.findFirst({
    where: {
      userId,
      leftAt: null,
      room: {
        visibility: RoomVisibility.RANKED,
        status: RoomStatus.IN_GAME,
        currentMatchId: {
          not: null,
        },
        currentMatch: {
          status: {
            in: [GameMatchStatus.PENDING, GameMatchStatus.ACTIVE],
          },
          mode: MatchMode.RANKED,
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
    select: {
      roomId: true,
      room: {
        select: {
          currentMatchId: true,
          currentMatch: {
            select: {
              snapshot: true,
            },
          },
        },
      },
    },
  });

  if (!membership?.room.currentMatchId) {
    return null;
  }

  return buildRankedSessionLookup({
    roomId: membership.roomId,
    matchId: membership.room.currentMatchId,
    snapshot: membership.room.currentMatch?.snapshot as Prisma.JsonValue | null,
    userId,
  });
}

export async function findRankedMatchSessionForUser(params: {
  userId: string;
  matchId: string;
}): Promise<RankedSessionLookup | null> {
  const { userId, matchId } = params;

  const match = await prisma.gameMatch.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      roomId: true,
      room: {
        select: {
          visibility: true,
        },
      },
      participants: {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      },
      snapshot: true,
    },
  });

  if (
    !match ||
    !match.room ||
    !match.roomId ||
    match.room.visibility !== RoomVisibility.RANKED ||
    match.participants.length === 0
  ) {
    return null;
  }

  return buildRankedSessionLookup({
    roomId: match.roomId,
    matchId: match.id,
    snapshot: match.snapshot as Prisma.JsonValue | null,
    userId,
  });
}

export async function persistRankedMatchResult(params: {
  matchId: string;
  winner: "seat1" | "seat2" | "draw" | null;
  endedBy: GameMatchEndReason | undefined;
}): Promise<void> {
  const { matchId, winner, endedBy } = params;

  const match = await prisma.gameMatch.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      mode: true,
      player1MmrAfter: true,
      player2MmrAfter: true,
      participants: {
        orderBy: {
          seat: "asc",
        },
        select: {
          seat: true,
          userId: true,
          user: {
            select: {
              rankedMmr: true,
              rankedWins: true,
              rankedLosses: true,
              rankedDraws: true,
            },
          },
        },
      },
    },
  });

  if (
    !match ||
    match.mode !== MatchMode.RANKED ||
    match.participants.length !== 2 ||
    (match.player1MmrAfter !== null && match.player2MmrAfter !== null)
  ) {
    return;
  }

  const seat1 = match.participants[0];
  const seat2 = match.participants[1];
  const seat1Result = buildParticipantResult({
    participant: seat1 as RankedParticipantWithProfile,
    opponentMmr: seat2.user.rankedMmr,
    winner,
  });
  const seat2Result = buildParticipantResult({
    participant: seat2 as RankedParticipantWithProfile,
    opponentMmr: seat1.user.rankedMmr,
    winner,
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: seat1Result.userId },
      data: {
        rankedMmr: seat1Result.mmrAfter,
        rankedWins: seat1Result.outcome === RANKED_MATCH_OUTCOME.WIN ? { increment: 1 } : undefined,
        rankedLosses: seat1Result.outcome === RANKED_MATCH_OUTCOME.LOSE ? { increment: 1 } : undefined,
        rankedDraws: seat1Result.outcome === RANKED_MATCH_OUTCOME.DRAW ? { increment: 1 } : undefined,
      },
    }),
    prisma.user.update({
      where: { id: seat2Result.userId },
      data: {
        rankedMmr: seat2Result.mmrAfter,
        rankedWins: seat2Result.outcome === RANKED_MATCH_OUTCOME.WIN ? { increment: 1 } : undefined,
        rankedLosses: seat2Result.outcome === RANKED_MATCH_OUTCOME.LOSE ? { increment: 1 } : undefined,
        rankedDraws: seat2Result.outcome === RANKED_MATCH_OUTCOME.DRAW ? { increment: 1 } : undefined,
      },
    }),
    prisma.gameMatch.update({
      where: { id: matchId },
      data: {
        player1MmrBefore: seat1Result.mmrBefore,
        player2MmrBefore: seat2Result.mmrBefore,
        player1MmrAfter: seat1Result.mmrAfter,
        player2MmrAfter: seat2Result.mmrAfter,
        endedBy,
      },
    }),
  ]);
}

export async function findRankedMatchResultForUser(params: {
  userId: string;
  matchId: string;
}): Promise<RankedMatchResultSummary | null> {
  const { userId, matchId } = params;

  const match = await prisma.gameMatch.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      roomId: true,
      mode: true,
      player1MmrBefore: true,
      player2MmrBefore: true,
      player1MmrAfter: true,
      player2MmrAfter: true,
      participants: {
        where: {
          userId,
        },
        select: {
          seat: true,
        },
      },
    },
  });

  if (
    !match ||
    !match.roomId ||
    match.mode !== MatchMode.RANKED ||
    match.participants.length === 0 ||
    match.player1MmrBefore === null ||
    match.player2MmrBefore === null ||
    match.player1MmrAfter === null ||
    match.player2MmrAfter === null
  ) {
    return null;
  }

  const seat = match.participants[0].seat;
  const mmrBefore = seat === 1 ? match.player1MmrBefore : match.player2MmrBefore;
  const mmrAfter = seat === 1 ? match.player1MmrAfter : match.player2MmrAfter;

  return {
    matchId: match.id,
    roomId: match.roomId,
    rank: getRankFromMmr(mmrAfter),
    mmrBefore,
    mmrAfter,
    mmrDelta: mmrAfter - mmrBefore,
  };
}
