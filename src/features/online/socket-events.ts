import type { ColumnIndex } from "@/features/game/core/types";
import type { OnlineAuthoritativeSnapshot } from "@/server/rooms/authoritative-engine";

export const ONLINE_SOCKET_EVENT = {
  ROOM_JOIN: "room_join",
  ROOM_LEAVE: "room_leave",
  MOVE_SUBMIT: "move_submit",
  MOVE_APPLIED: "move_applied",
  MOVE_REJECTED: "move_rejected",
  SYNC_REQUEST: "sync_request",
  SYNC_RESPONSE: "sync_response",
  ROOM_STATE: "room_state",
  MATCH_FINISHED: "match_finished",
  PEER_CONNECTION_STATE: "peer_connection_state",
  TURN_TIMER_UPDATED: "turn_timer_updated",
  TURN_TIMEOUT_APPLIED: "turn_timeout_applied",
  ERROR: "error",
} as const;

export const PEER_CONNECTION_REASON = {
  DISCONNECT: "disconnect",
  LEFT_MATCH: "left_match",
} as const;

export type MoveSubmitEvent = {
  roomId: string;
  matchId: string;
  columnIndex: ColumnIndex;
  expectedRevision: number;
  clientMoveId: string;
  submittedAt: number;
};

export type MoveAppliedEvent = {
  roomId: string;
  matchId: string;
  revision: number;
  snapshot: OnlineAuthoritativeSnapshot;
  clientMoveId: string;
  serverReceivedAt: number;
  serverAppliedAt: number;
};

export type MoveRejectedEvent = {
  roomId: string;
  matchId: string;
  reason:
    | "NOT_YOUR_TURN"
    | "REVISION_MISMATCH"
    | "INVALID_COLUMN"
    | "RATE_LIMIT"
    | "INVALID_PAYLOAD"
    | "PERSIST_FAILED";
  expectedRevision: number;
  currentRevision: number;
  clientMoveId: string;
};

export type SyncRequestEvent = {
  roomId: string;
  matchId: string;
  lastSeenRevision: number;
};

export type SyncResponseEvent = {
  roomId: string;
  matchId: string;
  revision: number;
  snapshot: OnlineAuthoritativeSnapshot;
  deltaEvents: Array<{ revision: number; type: string }>;
  serverRespondedAt: number;
};

export type MatchFinishedEvent = {
  roomId: string;
  matchId: string;
  revision: number;
  snapshot: OnlineAuthoritativeSnapshot;
  endedBy?: "NORMAL" | "TIMEOUT" | "DISCONNECT" | "LEAVE" | "DRAW";
};

export type TurnTimerUpdatedEvent = {
  roomId: string;
  matchId: string;
  turnUserId: string | null;
  turnDeadlineMs: number | null;
};

export type TurnTimeoutAppliedEvent = {
  roomId: string;
  matchId: string;
  userId: string;
  columnIndex: ColumnIndex;
  strikeCount: number;
  strikeLimit: number;
  revision: number;
  snapshot: OnlineAuthoritativeSnapshot;
};

export type PeerConnectionStateEvent = {
  roomId: string;
  userId: string;
  connected: boolean;
  at: number;
  reason?: (typeof PEER_CONNECTION_REASON)[keyof typeof PEER_CONNECTION_REASON];
  disconnectedAt?: number;
  graceEndsAt?: number;
};
