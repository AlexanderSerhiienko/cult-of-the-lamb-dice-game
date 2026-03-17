import type { OnlineAuthoritativeSnapshot } from "@/server/rooms/authoritative-engine";

export type OnlineSnapshot = OnlineAuthoritativeSnapshot;

export type OpponentConnectionState = "connected" | "disconnected" | "left_match";

export type OnlineUiStatus =
  | "loading"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "move_pending"
  | "opponent_disconnected"
  | "opponent_left"
  | "sync_error"
  | "service_unavailable";

export function isOnlineInteractionBlocked(status: OnlineUiStatus): boolean {
  return (
    status === "loading" ||
    status === "connecting" ||
    status === "reconnecting" ||
    status === "move_pending" ||
    status === "sync_error" ||
    status === "service_unavailable" ||
    status === "opponent_left"
  );
}

export function getReconnectCtaLabel(params: {
  reconnectDeadlineMs: number | null;
  nowMs: number;
}): string {
  const { reconnectDeadlineMs, nowMs } = params;

  if (typeof reconnectDeadlineMs !== "number") {
    return "Return to active match";
  }

  const reconnectSecondsLeft = Math.max(0, Math.ceil((reconnectDeadlineMs - nowMs) / 1000));
  return reconnectSecondsLeft > 0
    ? `Reconnect to active match (${reconnectSecondsLeft}s)`
    : "Return to active match";
}

export function describeMoveRejectionReason(reason: string): string {
  switch (reason) {
    case "REVISION_MISMATCH":
      return "Game state updated. Please try your move again.";
    case "NOT_YOUR_TURN":
      return "It is no longer your turn.";
    case "INVALID_COLUMN":
      return "That column is no longer available.";
    case "RATE_LIMIT":
      return "Too many move attempts in a short time. Please wait a moment.";
    case "PERSIST_FAILED":
      return "Server could not save the move. Please try again.";
    case "INVALID_PAYLOAD":
      return "Move payload was invalid. Please refresh the match if this keeps happening.";
    default:
      return "Move was rejected by the server. Please try again.";
  }
}

export function deriveOnlineUiStatus(params: {
  transportState: "idle" | "loading_token" | "connecting" | "connected" | "reconnecting" | "disconnected";
  mySeat: 1 | 2 | null;
  movePending: boolean;
  opponentConnectionState: OpponentConnectionState;
  error: string | null;
}): OnlineUiStatus {
  const { transportState, mySeat, movePending, opponentConnectionState, error } = params;

  if (opponentConnectionState === "left_match") {
    return "opponent_left";
  }

  if (transportState === "loading_token" || transportState === "idle") {
    return "loading";
  }

  if (transportState === "connecting") {
    return "connecting";
  }

  if (!mySeat) {
    if (transportState === "reconnecting" || transportState === "disconnected") {
      return error ? "service_unavailable" : "reconnecting";
    }

    return "loading";
  }

  if (error) {
    if (transportState === "reconnecting" || transportState === "disconnected") {
      return "service_unavailable";
    }
    return "sync_error";
  }

  if (opponentConnectionState === "disconnected") {
    return "opponent_disconnected";
  }

  if (movePending) {
    return "move_pending";
  }

  if (transportState === "reconnecting" || transportState === "disconnected") {
    return "reconnecting";
  }

  return "connected";
}
