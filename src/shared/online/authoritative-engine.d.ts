import type { Board, ColumnIndex, DieValue } from "@/features/game/core/types";

export type OnlineConnectionState = {
  status: "connected" | "disconnected";
  disconnectedAt: number | null;
  reconnectDeadlineMs: number | null;
};

export type OnlineAuthoritativeSnapshot = {
  roomId: string;
  matchId: string;
  revision: number;
  phase: "player_turn" | "finished";
  currentRoll: DieValue | null;
  playerBoard: Board;
  botBoard: Board;
  scores: { player: number; bot: number };
  winner: "player" | "bot" | "draw" | null;
  turnUserId: string | null;
  players: {
    seat1: string;
    seat2: string;
  };
  connectionStates?: Record<string, OnlineConnectionState>;
};

export function createInitialOnlineSnapshot(params: {
  roomId: string;
  matchId: string;
  seat1UserId: string;
  seat2UserId: string;
}): OnlineAuthoritativeSnapshot;

export function canUserMove(snapshot: OnlineAuthoritativeSnapshot, userId: string): boolean;

export function applyOnlineMove(params: {
  snapshot: OnlineAuthoritativeSnapshot;
  userId: string;
  columnIndex: ColumnIndex;
}): OnlineAuthoritativeSnapshot;

export function applyDisconnectForfeit(params: {
  snapshot: OnlineAuthoritativeSnapshot | null;
  disconnectedUserId: string;
}): OnlineAuthoritativeSnapshot | null;
