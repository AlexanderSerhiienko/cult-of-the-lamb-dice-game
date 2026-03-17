import { GameMatchEndReason, Prisma, RoomStatus } from "@prisma/client";
import { GAME_RESULT } from "@/features/game/core/types";
import { upsertMatchResultForUser } from "@/server/matches/repository";
import { MATCH_OUTCOME, TRACKED_MATCH_MODE } from "@/server/matches/types";
import { finalizeRankedMatch } from "@/server/ranked/service";
import {
  applyOnlineMove,
  canUserMove,
  createInitialOnlineSnapshot,
  type OnlineAuthoritativeSnapshot,
} from "@/server/rooms/authoritative-engine";
import {
  addOrRestoreRoomMember,
  closeRoomAfterMatchFinished,
  createPendingMatchForRoom,
  createPrivateRoom,
  findMatchById,
  findRoomByCode,
  getRoomSnapshotById,
  leaveRoomMember,
  markMatchStarted,
  updateMatchSnapshot,
} from "@/server/rooms/repository";
import type {
  JoinRoomInput,
  LeaveRoomInput,
  RoomSnapshot,
  StartRoomMatchInput,
  SubmitMoveInput,
} from "@/server/rooms/types";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_ACTIVE_MEMBERS = 2;

function logRoomTransition(event: string, payload: Record<string, unknown>) {
  console.info(`[rooms] ${event}`, payload);
}

export class RoomServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

function getActiveMembersCount(snapshot: RoomSnapshot): number {
  return snapshot.members.filter((member) => member.leftAt === null).length;
}

function isRoomCodeCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target
    : typeof error.meta?.target === "string"
      ? [error.meta.target]
      : [];

  return target.some((value) => String(value).includes("code"));
}

export async function createRoomForUser(userId: string): Promise<RoomSnapshot> {
  let attempts = 0;
  while (attempts < 5) {
    attempts += 1;
    const code = generateRoomCode();
    try {
      const room = await createPrivateRoom({ hostId: userId, code });
      logRoomTransition("create", { userId, roomId: room.room.id, code: room.room.code });
      return room;
    } catch (error) {
      if (isRoomCodeCollision(error)) {
        continue;
      }

      console.error("[rooms] create_failed", {
        userId,
        attempt: attempts,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new RoomServiceError("Failed to create room", 500);
    }
  }

  throw new RoomServiceError("Failed to generate room code", 500);
}

export async function joinRoomByCode(input: JoinRoomInput): Promise<RoomSnapshot> {
  const room = await findRoomByCode(input.code);
  if (!room) {
    throw new RoomServiceError("Room not found", 404);
  }

  if (room.room.status !== RoomStatus.WAITING) {
    throw new RoomServiceError("Room is not joinable", 409);
  }

  const activeMembers = getActiveMembersCount(room);
  const alreadyMember = room.members.some((member) => member.userId === input.userId && member.leftAt === null);
  if (!alreadyMember && activeMembers >= MAX_ACTIVE_MEMBERS) {
    throw new RoomServiceError("Room is full", 409);
  }

  await addOrRestoreRoomMember({
    roomId: room.room.id,
    userId: input.userId,
  });

  const updated = await getRoomSnapshotById(room.room.id);
  if (!updated) {
    throw new RoomServiceError("Room not found", 404);
  }

  logRoomTransition("join", { userId: input.userId, roomId: room.room.id, code: room.room.code });
  return updated;
}

export async function leaveRoom(input: LeaveRoomInput): Promise<RoomSnapshot> {
  const current = await getRoomSnapshotById(input.roomId);
  if (!current) {
    throw new RoomServiceError("Room not found", 404);
  }

  await leaveRoomMember({
    roomId: input.roomId,
    userId: input.userId,
  });

  const updated = await getRoomSnapshotById(input.roomId);
  if (!updated) {
    throw new RoomServiceError("Room not found", 404);
  }

  logRoomTransition("leave", { userId: input.userId, roomId: input.roomId });
  return updated;
}

export async function startRoomMatch(input: StartRoomMatchInput): Promise<{
  room: RoomSnapshot;
  matchId: string;
  snapshot: OnlineAuthoritativeSnapshot;
}> {
  const room = await getRoomSnapshotById(input.roomId);
  if (!room) {
    throw new RoomServiceError("Room not found", 404);
  }
  if (room.room.hostId !== input.userId) {
    throw new RoomServiceError("Only host can start match", 403);
  }

  const activeMembers = room.members.filter((member) => member.leftAt === null);
  if (activeMembers.length !== MAX_ACTIVE_MEMBERS) {
    throw new RoomServiceError("Need exactly 2 active players", 409);
  }

  const { matchId } = await createPendingMatchForRoom({
    roomId: input.roomId,
  });
  const [seat1, seat2] = activeMembers;
  const snapshot = createInitialOnlineSnapshot({
    roomId: input.roomId,
    matchId,
    seat1UserId: seat1.userId,
    seat2UserId: seat2.userId,
  });
  await markMatchStarted(matchId, snapshot, snapshot.currentRoll ?? 1);

  const updated = await getRoomSnapshotById(input.roomId);
  if (!updated) {
    throw new RoomServiceError("Room not found", 404);
  }

  logRoomTransition("start_match", {
    roomId: input.roomId,
    matchId,
    hostId: input.userId,
  });
  return {
    room: updated,
    matchId,
    snapshot,
  };
}

function resolveWinnerUserId(snapshot: OnlineAuthoritativeSnapshot): string | null {
  if (snapshot.winner === "seat1") {
    return snapshot.players.seat1;
  }
  if (snapshot.winner === "seat2") {
    return snapshot.players.seat2;
  }
  return null;
}

function mapOutcomeForUser(params: {
  winner: OnlineAuthoritativeSnapshot["winner"];
  userId: string;
  seat1: string;
  seat2: string;
}) {
  const { winner, userId, seat1, seat2 } = params;
  if (winner === GAME_RESULT.DRAW) {
    return MATCH_OUTCOME.DRAW;
  }
  if (winner === "seat1") {
    return userId === seat1 ? MATCH_OUTCOME.WIN : MATCH_OUTCOME.LOSE;
  }
  if (winner === "seat2") {
    return userId === seat2 ? MATCH_OUTCOME.WIN : MATCH_OUTCOME.LOSE;
  }
  return MATCH_OUTCOME.DRAW;
}

async function persistOnlineMatchResults(snapshot: OnlineAuthoritativeSnapshot) {
  const userIds = [snapshot.players.seat1, snapshot.players.seat2];
  const seat1Score = snapshot.seatScores.seat1;
  const seat2Score = snapshot.seatScores.seat2;

  await Promise.all(
    userIds.map((userId) =>
      upsertMatchResultForUser({
        userId,
        input: {
          externalMatchId: snapshot.matchId,
          mode: TRACKED_MATCH_MODE.ONLINE,
          outcome: mapOutcomeForUser({
            winner: snapshot.winner,
            userId,
            seat1: snapshot.players.seat1,
            seat2: snapshot.players.seat2,
          }),
          playerScore: userId === snapshot.players.seat1 ? seat1Score : seat2Score,
          opponentScore: userId === snapshot.players.seat1 ? seat2Score : seat1Score,
        },
      }),
    ),
  );
}

export async function submitOnlineMove(input: SubmitMoveInput): Promise<OnlineAuthoritativeSnapshot> {
  const match = await findMatchById(input.matchId);
  if (!match || !match.snapshot) {
    throw new RoomServiceError("Match not found", 404);
  }
  if (match.roomId !== input.roomId) {
    throw new RoomServiceError("Room mismatch", 409);
  }
  if (match.revision !== input.expectedRevision) {
    throw new RoomServiceError("Revision mismatch", 409);
  }

  const snapshot = match.snapshot as OnlineAuthoritativeSnapshot;
  if (!canUserMove(snapshot, input.userId)) {
    throw new RoomServiceError("Not your turn", 409);
  }

  let nextSnapshot: OnlineAuthoritativeSnapshot;
  try {
    nextSnapshot = applyOnlineMove({
      snapshot,
      userId: input.userId,
      columnIndex: input.columnIndex,
    });
  } catch (error) {
    throw new RoomServiceError(error instanceof Error ? error.message : "Move rejected", 400);
  }

  const finishWinnerUserId = nextSnapshot.winner ? resolveWinnerUserId(nextSnapshot) : null;
  await updateMatchSnapshot({
    matchId: input.matchId,
    revision: nextSnapshot.revision,
    phase: nextSnapshot.phase,
    currentRoll: nextSnapshot.currentRoll,
    snapshot: nextSnapshot,
    actorUserId: input.userId,
    finish: nextSnapshot.winner ? { winnerUserId: finishWinnerUserId } : undefined,
  });

  if (nextSnapshot.winner) {
    await persistOnlineMatchResults(nextSnapshot);
  }

  logRoomTransition("move_applied", {
    roomId: input.roomId,
    matchId: input.matchId,
    actorUserId: input.userId,
    revision: nextSnapshot.revision,
    finished: Boolean(nextSnapshot.winner),
  });

  return nextSnapshot;
}

export async function getRealtimeBootstrapSnapshot(params: {
  roomId: string;
  matchId: string;
}): Promise<OnlineAuthoritativeSnapshot> {
  const match = await findMatchById(params.matchId);
  if (!match || !match.snapshot || match.roomId !== params.roomId) {
    throw new RoomServiceError("Match not found", 404);
  }

  return match.snapshot as OnlineAuthoritativeSnapshot;
}

export async function saveRealtimeMatchState(params: {
  roomId: string;
  matchId: string;
  snapshot: OnlineAuthoritativeSnapshot;
  finished: boolean;
  endedBy?: GameMatchEndReason;
}): Promise<void> {
  const { roomId, matchId, snapshot, finished, endedBy } = params;
  const match = await findMatchById(matchId);
  if (!match || match.roomId !== roomId) {
    throw new RoomServiceError("Match not found", 404);
  }

  await updateMatchSnapshot({
    matchId,
    revision: snapshot.revision,
    phase: snapshot.phase,
    currentRoll: snapshot.currentRoll,
    snapshot,
    actorUserId: snapshot.turnUserId,
    finish: finished
      ? {
          winnerUserId: resolveWinnerUserId(snapshot),
          endedBy,
        }
      : undefined,
  });

  if (finished) {
    if (match.mode === "RANKED") {
      await finalizeRankedMatch({
        matchId,
        winner: snapshot.winner,
        endedBy,
      });
    } else {
      await persistOnlineMatchResults(snapshot);
    }
    await closeRoomAfterMatchFinished(roomId);
  }
}
