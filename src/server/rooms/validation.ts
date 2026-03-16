import type { JoinRoomInput, StartRoomMatchInput, SubmitMoveInput } from "@/server/rooms/types";

const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;
const ROOM_ID_PATTERN = /^[a-z0-9]{10,}$/i;

export function parseJoinRoomInput(payload: unknown): JoinRoomInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }

  const { code, userId } = payload as Partial<JoinRoomInput>;

  if (typeof code !== "string" || !ROOM_CODE_PATTERN.test(code)) {
    throw new Error("Invalid room code");
  }

  if (typeof userId !== "string" || userId.length < 3) {
    throw new Error("Invalid userId");
  }

  return { code, userId };
}

export function parseStartRoomMatchInput(payload: unknown): StartRoomMatchInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }

  const { roomId, userId } = payload as Partial<StartRoomMatchInput>;
  if (typeof roomId !== "string" || !ROOM_ID_PATTERN.test(roomId)) {
    throw new Error("Invalid roomId");
  }
  if (typeof userId !== "string" || userId.length < 3) {
    throw new Error("Invalid userId");
  }

  return { roomId, userId };
}

export function parseSubmitMoveInput(payload: unknown): SubmitMoveInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }

  const { roomId, matchId, userId, columnIndex, expectedRevision } = payload as Partial<SubmitMoveInput>;

  if (typeof roomId !== "string" || !ROOM_ID_PATTERN.test(roomId)) {
    throw new Error("Invalid roomId");
  }
  if (typeof matchId !== "string" || !ROOM_ID_PATTERN.test(matchId)) {
    throw new Error("Invalid matchId");
  }
  if (typeof userId !== "string" || userId.length < 3) {
    throw new Error("Invalid userId");
  }
  if (columnIndex !== 0 && columnIndex !== 1 && columnIndex !== 2) {
    throw new Error("Invalid columnIndex");
  }
  if (
    typeof expectedRevision !== "number" ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    throw new Error("Invalid expectedRevision");
  }

  return {
    roomId,
    matchId,
    userId,
    columnIndex,
    expectedRevision,
  };
}
