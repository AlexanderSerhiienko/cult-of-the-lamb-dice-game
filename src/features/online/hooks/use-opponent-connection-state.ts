"use client";

import { useCallback, useState } from "react";
import { PEER_CONNECTION_REASON } from "@/features/online/socket-events";
import type { PeerConnectionStateEvent } from "@/features/online/socket-events";
import { OPPONENT_CONNECTION_STATE, type OpponentConnectionState } from "@/features/online/types";

export function useOpponentConnectionState(userId: string) {
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [opponentDisconnectDeadlineMs, setOpponentDisconnectDeadlineMs] = useState<number | null>(null);
  const [opponentConnectionState, setOpponentConnectionState] =
    useState<OpponentConnectionState>(OPPONENT_CONNECTION_STATE.CONNECTED);

  const resetOpponentConnectionState = useCallback(() => {
    setOpponentDisconnected(false);
    setOpponentDisconnectDeadlineMs(null);
    setOpponentConnectionState(OPPONENT_CONNECTION_STATE.CONNECTED);
  }, []);

  const handlePeerConnectionState = useCallback(
    (payload: PeerConnectionStateEvent | null | undefined) => {
      if (!payload || payload.userId === userId) {
        return;
      }

      if (payload.connected) {
        resetOpponentConnectionState();
        return;
      }

      if (payload.reason === PEER_CONNECTION_REASON.LEFT_MATCH) {
        setOpponentDisconnected(false);
        setOpponentDisconnectDeadlineMs(null);
        setOpponentConnectionState(OPPONENT_CONNECTION_STATE.LEFT_MATCH);
        return;
      }

      setOpponentDisconnected(true);
      setOpponentConnectionState(OPPONENT_CONNECTION_STATE.DISCONNECTED);
      setOpponentDisconnectDeadlineMs(
        typeof payload.graceEndsAt === "number" ? payload.graceEndsAt : Date.now() + 60_000,
      );
    },
    [resetOpponentConnectionState, userId],
  );

  return {
    opponentDisconnected,
    opponentDisconnectDeadlineMs,
    opponentConnectionState,
    resetOpponentConnectionState,
    handlePeerConnectionState,
  };
}
