import {
  GameMatchEndReason,
  GameMatchEventType,
  GameMatchStatus,
  Prisma,
  RoomMemberRole,
  RoomStatus,
  RoomVisibility,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { RoomSnapshot } from "@/server/rooms/types";

function toRoomSnapshot(raw: {
  id: string;
  code: string;
  status: RoomStatus;
  hostId: string;
  createdAt: Date;
  currentMatchId: string | null;
  members: Array<{
    userId: string;
    role: RoomMemberRole;
    joinedAt: Date;
    leftAt: Date | null;
    user: { name: string | null; email: string | null };
  }>;
}): RoomSnapshot {
  return {
    room: {
      id: raw.id,
      code: raw.code,
      status: raw.status,
      hostId: raw.hostId,
      createdAt: raw.createdAt,
    },
    currentMatchId: raw.currentMatchId,
    members: raw.members.map((member) => ({
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt,
      name: member.user.name,
      email: member.user.email,
    })),
  };
}

export async function createPrivateRoom(params: {
  hostId: string;
  code: string;
}): Promise<RoomSnapshot> {
  const { hostId, code } = params;
  const room = await prisma.room.create({
    data: {
      code,
      visibility: RoomVisibility.PRIVATE,
      status: RoomStatus.WAITING,
      hostId,
      members: {
        create: {
          userId: hostId,
          role: RoomMemberRole.HOST,
        },
      },
    },
    include: {
      members: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  return toRoomSnapshot(room);
}

export async function findRoomByCode(code: string): Promise<RoomSnapshot | null> {
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      members: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!room) {
    return null;
  }

  return toRoomSnapshot(room);
}

export async function addOrRestoreRoomMember(params: {
  roomId: string;
  userId: string;
}): Promise<void> {
  const { roomId, userId } = params;
  await prisma.roomMember.upsert({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    update: {
      leftAt: null,
      lastSeenAt: new Date(),
    },
    create: {
      roomId,
      userId,
      role: RoomMemberRole.PLAYER,
    },
  });
}

export async function leaveRoomMember(params: {
  roomId: string;
  userId: string;
}): Promise<void> {
  const { roomId, userId } = params;
  await prisma.roomMember.updateMany({
    where: {
      roomId,
      userId,
      leftAt: null,
    },
    data: {
      leftAt: new Date(),
    },
  });
}

export async function setRoomStatus(params: {
  roomId: string;
  status: RoomStatus;
}): Promise<void> {
  await prisma.room.update({
    where: { id: params.roomId },
    data: { status: params.status },
  });
}

export async function createPendingMatchForRoom(params: {
  roomId: string;
}): Promise<{ matchId: string }> {
  const { roomId } = params;
  const activeMembers = await prisma.roomMember.findMany({
    where: {
      roomId,
      leftAt: null,
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  const match = await prisma.gameMatch.create({
    data: {
      roomId,
      status: GameMatchStatus.PENDING,
      participants: {
        create: activeMembers.map((member, index) => ({
          userId: member.userId,
          seat: index === 0 ? 1 : 2,
        })),
      },
    },
    select: { id: true },
  });

  await prisma.room.update({
    where: { id: roomId },
    data: {
      currentMatchId: match.id,
      status: RoomStatus.IN_GAME,
    },
  });

  return { matchId: match.id };
}

export async function findMatchById(matchId: string) {
  return prisma.gameMatch.findUnique({
    where: { id: matchId },
    include: {
      participants: true,
      room: true,
    },
  });
}

export async function markMatchStarted(matchId: string, snapshot: unknown, currentRoll: number): Promise<void> {
  const serializedSnapshot = snapshot as Prisma.InputJsonValue;
  await prisma.gameMatch.update({
    where: { id: matchId },
    data: {
      status: GameMatchStatus.ACTIVE,
      startedAt: new Date(),
      phase: "player_turn",
      currentRoll,
      revision: 1,
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
}

export async function updateMatchSnapshot(params: {
  matchId: string;
  revision: number;
  phase: string;
  currentRoll: number | null;
  snapshot: unknown;
  actorUserId: string | null;
  finish?: {
    winnerUserId: string | null;
    endedBy?: GameMatchEndReason;
  };
}): Promise<void> {
  const { matchId, revision, phase, currentRoll, snapshot, actorUserId, finish } = params;
  const serializedSnapshot = snapshot as Prisma.InputJsonValue;

  await prisma.gameMatch.update({
    where: { id: matchId },
    data: {
      revision,
      phase,
      currentRoll,
      snapshot: serializedSnapshot,
      status: finish ? GameMatchStatus.FINISHED : undefined,
      endedAt: finish ? new Date() : undefined,
      winnerUserId: finish?.winnerUserId ?? undefined,
      endedBy: finish?.endedBy ?? undefined,
      events: finish
        ? {
            create: {
              seq: revision,
              eventType: GameMatchEventType.MATCH_FINISHED,
              actorUserId,
              payload: serializedSnapshot,
            },
          }
        : undefined,
    },
  });
}

export async function getRoomSnapshotById(roomId: string): Promise<RoomSnapshot | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!room) {
    return null;
  }
  return toRoomSnapshot(room);
}

export async function hasUserLeftRoom(params: { roomId: string; userId: string }): Promise<boolean> {
  const member = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId: params.roomId,
        userId: params.userId,
      },
    },
    select: {
      leftAt: true,
    },
  });

  return Boolean(member?.leftAt);
}

export async function findActiveMatchForUser(userId: string): Promise<{
  roomId: string;
  matchId: string;
  reconnectDeadlineMs: number | null;
} | null> {
  const membership = await prisma.roomMember.findFirst({
    where: {
      userId,
      leftAt: null,
      room: {
        status: RoomStatus.IN_GAME,
        currentMatchId: {
          not: null,
        },
        currentMatch: {
          status: {
            in: [GameMatchStatus.PENDING, GameMatchStatus.ACTIVE],
          },
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
          id: true,
          currentMatchId: true,
          currentMatch: {
            select: {
              status: true,
              phase: true,
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

  const currentMatch = membership.room.currentMatch;
  const snapshot = currentMatch?.snapshot as { winner?: unknown; phase?: unknown } | null;
  const snapshotWinner = snapshot && "winner" in snapshot ? snapshot.winner : null;
  const snapshotPhase = snapshot && "phase" in snapshot ? snapshot.phase : null;
  const connectionStates =
    snapshot && "connectionStates" in snapshot
      ? (snapshot.connectionStates as Record<
          string,
          {
            reconnectDeadlineMs?: unknown;
            status?: unknown;
          }
        > | null)
      : null;
  const reconnectDeadlineRaw = connectionStates?.[userId]?.reconnectDeadlineMs;
  const reconnectDeadlineMs =
    typeof reconnectDeadlineRaw === "number" && reconnectDeadlineRaw > Date.now() ? reconnectDeadlineRaw : null;

  if (snapshotWinner !== null || snapshotPhase === "finished") {
    return null;
  }

  return {
    roomId: membership.roomId,
    matchId: membership.room.currentMatchId,
    reconnectDeadlineMs,
  };
}

export async function findCurrentMatchIdByRoomId(roomId: string): Promise<string | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      currentMatchId: true,
    },
  });

  return room?.currentMatchId ?? null;
}

export async function closeRoomAfterMatchFinished(roomId: string): Promise<void> {
  await prisma.room.update({
    where: { id: roomId },
    data: {
      status: RoomStatus.CLOSED,
      currentMatchId: null,
      closedAt: new Date(),
    },
  });
}
