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
};

export const PEER_CONNECTION_REASON = {
  DISCONNECT: "disconnect",
  LEFT_MATCH: "left_match",
};

export const CONNECTION_STATE_STATUS = {
  DISCONNECTED: "disconnected",
};
