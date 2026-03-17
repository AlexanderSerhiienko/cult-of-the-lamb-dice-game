import type { OnlineAuthoritativeSnapshot } from "@/server/rooms/authoritative-engine";
import {
  REALTIME_TRANSPORT_STATE,
  type RealtimeTransportState,
} from "@/features/online/hooks/use-realtime-transport";

export type OnlineSnapshot = OnlineAuthoritativeSnapshot;

export const OPPONENT_CONNECTION_STATE = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  LEFT_MATCH: "left_match",
} as const;

export type OpponentConnectionState =
  (typeof OPPONENT_CONNECTION_STATE)[keyof typeof OPPONENT_CONNECTION_STATE];

export const ONLINE_UI_STATUS = {
  LOADING: "loading",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  MOVE_PENDING: "move_pending",
  OPPONENT_DISCONNECTED: "opponent_disconnected",
  OPPONENT_LEFT: "opponent_left",
  SYNC_ERROR: "sync_error",
  SERVICE_UNAVAILABLE: "service_unavailable",
} as const;

export type OnlineUiStatus = (typeof ONLINE_UI_STATUS)[keyof typeof ONLINE_UI_STATUS];

const BLOCKED_STATUSES = new Set<OnlineUiStatus>([
  ONLINE_UI_STATUS.LOADING,
  ONLINE_UI_STATUS.CONNECTING,
  ONLINE_UI_STATUS.RECONNECTING,
  ONLINE_UI_STATUS.MOVE_PENDING,
  ONLINE_UI_STATUS.SYNC_ERROR,
  ONLINE_UI_STATUS.SERVICE_UNAVAILABLE,
  ONLINE_UI_STATUS.OPPONENT_LEFT,
]);

export function isOnlineInteractionBlocked(status: OnlineUiStatus): boolean {
  return BLOCKED_STATUSES.has(status);
}

export function getReconnectCtaLabel(params: {
  reconnectDeadlineMs: number | null;
  nowMs: number;
}): string {
  const { reconnectDeadlineMs, nowMs } = params;

  if (typeof reconnectDeadlineMs !== "number") {
    return "Return to active match";
  }

  const secondsLeft = Math.max(0, Math.ceil((reconnectDeadlineMs - nowMs) / 1000));
  return secondsLeft > 0 ? `Reconnect to active match (${secondsLeft}s)` : "Return to active match";
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
  transportState: RealtimeTransportState;
  mySeat: 1 | 2 | null;
  movePending: boolean;
  opponentConnectionState: OpponentConnectionState;
  error: string | null;
}): OnlineUiStatus {
  const { transportState, mySeat, movePending, opponentConnectionState, error } = params;
  const isTransportUnavailable =
    transportState === REALTIME_TRANSPORT_STATE.RECONNECTING ||
    transportState === REALTIME_TRANSPORT_STATE.DISCONNECTED;
  const isSeatUnknown = !mySeat;
  const hasRecoverableError = Boolean(error) && isTransportUnavailable;
  const hasFatalSyncError = Boolean(error) && !isTransportUnavailable;

  if (opponentConnectionState === OPPONENT_CONNECTION_STATE.LEFT_MATCH) {
    return ONLINE_UI_STATUS.OPPONENT_LEFT;
  }

  if (
    transportState === REALTIME_TRANSPORT_STATE.LOADING_TOKEN ||
    transportState === REALTIME_TRANSPORT_STATE.IDLE
  ) {
    return ONLINE_UI_STATUS.LOADING;
  }

  if (transportState === REALTIME_TRANSPORT_STATE.CONNECTING) {
    return ONLINE_UI_STATUS.CONNECTING;
  }

  if (isSeatUnknown) {
    if (isTransportUnavailable) {
      return hasRecoverableError ? ONLINE_UI_STATUS.SERVICE_UNAVAILABLE : ONLINE_UI_STATUS.RECONNECTING;
    }

    return ONLINE_UI_STATUS.LOADING;
  }

  if (hasRecoverableError) {
    return ONLINE_UI_STATUS.SERVICE_UNAVAILABLE;
  }

  if (hasFatalSyncError) {
    return ONLINE_UI_STATUS.SYNC_ERROR;
  }

  if (opponentConnectionState === OPPONENT_CONNECTION_STATE.DISCONNECTED) {
    return ONLINE_UI_STATUS.OPPONENT_DISCONNECTED;
  }

  if (movePending) {
    return ONLINE_UI_STATUS.MOVE_PENDING;
  }

  if (isTransportUnavailable) {
    return ONLINE_UI_STATUS.RECONNECTING;
  }

  return ONLINE_UI_STATUS.CONNECTED;
}
