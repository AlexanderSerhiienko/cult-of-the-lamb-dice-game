import type { Board, ColumnIndex, DieValue, GamePhase, GameWinner, PlayerScores } from "@/features/game/core/types";

export const ROOM_STATUS = {
  WAITING: "WAITING",
  IN_GAME: "IN_GAME",
  CLOSED: "CLOSED",
} as const;

export const ROOM_MEMBER_ROLE = {
  HOST: "HOST",
  PLAYER: "PLAYER",
} as const;

export type RoomMemberRole = (typeof ROOM_MEMBER_ROLE)[keyof typeof ROOM_MEMBER_ROLE];

export type RoomSummary = {
  id: string;
  code: string;
  status: (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];
  hostId: string;
  createdAt: Date;
};

export type RoomMemberSummary = {
  userId: string;
  role: RoomMemberRole;
  joinedAt: Date;
  leftAt: Date | null;
  name: string | null;
  email: string | null;
};

export type RoomSnapshot = {
  room: RoomSummary;
  members: RoomMemberSummary[];
  currentMatchId: string | null;
};

export type CreateRoomInput = {
  userId: string;
};

export type JoinRoomInput = {
  code: string;
  userId: string;
};

export type LeaveRoomInput = {
  roomId: string;
  userId: string;
};

export type StartRoomMatchInput = {
  roomId: string;
  userId: string;
};

export type SubmitMoveInput = {
  roomId: string;
  matchId: string;
  userId: string;
  columnIndex: ColumnIndex;
  expectedRevision: number;
};

export type MatchSnapshotPayload = {
  matchId: string;
  roomId: string;
  revision: number;
  phase: GamePhase;
  currentRoll: DieValue | null;
  playerBoard: Board;
  opponentBoard: Board;
  scores: PlayerScores;
  winner: GameWinner | null;
  actorUserId: string | null;
  seat: 1 | 2;
};
