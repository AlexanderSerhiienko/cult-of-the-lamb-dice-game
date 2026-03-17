"use client";

import { useCallback, useState } from "react";
import type { PeerConnectionStateEvent } from "@/features/online/socket-events";
import type { OpponentConnectionState } from "@/features/online/types";

export function useOpponentConnectionState(userId: string) {
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [opponentDisconnectDeadlineMs, setOpponentDisconnectDeadlineMs] = useState<number | null>(null);
  const [opponentConnectionState, setOpponentConnectionState] =
    useState<OpponentConnectionState>("connected");

  const resetOpponentConnectionState = useCallback(() => {
    setOpponentDisconnected(false);
    setOpponentDisconnectDeadlineMs(null);
    setOpponentConnectionState("connected");
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

      if (payload.reason === "left_match") {
        setOpponentDisconnected(false);
        setOpponentDisconnectDeadlineMs(null);
        setOpponentConnectionState("left_match");
        return;
      }

      setOpponentDisconnected(true);
      setOpponentConnectionState("disconnected");
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
