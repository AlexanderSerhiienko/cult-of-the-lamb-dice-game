"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { GAME_MODE } from "@/features/game/core/types";
import {
  ONLINE_SOCKET_EVENT,
  type MatchFinishedEvent,
  type PeerConnectionStateEvent,
  type SyncResponseEvent,
} from "@/features/online/socket-events";
import { useOnlineMoveSubmission } from "@/features/online/hooks/use-online-move-submission";
import { useOpponentConnectionState } from "@/features/online/hooks/use-opponent-connection-state";
import { useRealtimeTransport } from "@/features/online/hooks/use-realtime-transport";
import { getOnlineSeat } from "@/features/online/store-sync";
import { deriveOnlineUiStatus, type OnlineSnapshot } from "@/features/online/types";
import { useGameStore } from "@/features/game/store/use-game-store";

type UseOnlineRoomSocketParams = {
  roomId: string;
  matchId: string;
  userId: string;
  enabled?: boolean;
};

export function useOnlineRoomSocket({
  roomId,
  matchId,
  userId,
  enabled = true,
}: UseOnlineRoomSocketParams) {
  const applyOnlineServerState = useGameStore((state) => state.applyOnlineServerState);
  const setOnlineSession = useGameStore((state) => state.setOnlineSession);
  const clearOnlineSession = useGameStore((state) => state.clearOnlineSession);
  const mySeat = useGameStore((state) => state.onlineMySeat);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const snapshotRef = useRef<OnlineSnapshot | null>(null);
  const {
    opponentDisconnected,
    opponentDisconnectDeadlineMs,
    opponentConnectionState,
    resetOpponentConnectionState,
    handlePeerConnectionState,
  } = useOpponentConnectionState(userId);
  const { commitSnapshot, handleMoveApplied, handleMoveRejected, movePending, resetPendingMoveState, sendMove } =
    useOnlineMoveSubmission({
      roomId,
      matchId,
      userId,
      socketRef,
      snapshotRef,
      applyOnlineServerState,
      setError,
    });
  const bindSocketEvents = useCallback(
    (socket: Socket) => {
      socketRef.current = socket;

      const onConnect = () => {
        setError(null);
        socket.emit(ONLINE_SOCKET_EVENT.SYNC_REQUEST, {
          roomId,
          matchId,
          lastSeenRevision: useGameStore.getState().onlineRevision,
        });
      };

      const onDisconnect = () => {
        // handled by transport state
      };

      const onSyncResponse = (payload: SyncResponseEvent) => {
        if (!payload?.snapshot) {
          return;
        }
        const snapshot = payload.snapshot as OnlineSnapshot;
        const seat = getOnlineSeat(snapshot, userId);
        setOnlineSession({ roomId, seat });
        commitSnapshot(snapshot);
        resetOpponentConnectionState();
      };

      const onMatchFinished = (payload: MatchFinishedEvent) => {
        const snapshot = payload?.snapshot as OnlineSnapshot | undefined;
        if (!snapshot) {
          return;
        }

        commitSnapshot(snapshot);
        resetOpponentConnectionState();
      };

      const onPeerConnectionState = (payload: PeerConnectionStateEvent) => {
        handlePeerConnectionState(payload);
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on(ONLINE_SOCKET_EVENT.SYNC_RESPONSE, onSyncResponse);
      socket.on(ONLINE_SOCKET_EVENT.MOVE_APPLIED, handleMoveApplied);
      socket.on(ONLINE_SOCKET_EVENT.MOVE_REJECTED, handleMoveRejected);
      socket.on(ONLINE_SOCKET_EVENT.MATCH_FINISHED, onMatchFinished);
      socket.on(ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE, onPeerConnectionState);

      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off(ONLINE_SOCKET_EVENT.SYNC_RESPONSE, onSyncResponse);
        socket.off(ONLINE_SOCKET_EVENT.MOVE_APPLIED, handleMoveApplied);
        socket.off(ONLINE_SOCKET_EVENT.MOVE_REJECTED, handleMoveRejected);
        socket.off(ONLINE_SOCKET_EVENT.MATCH_FINISHED, onMatchFinished);
        socket.off(ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE, onPeerConnectionState);
      };
    },
    [
      commitSnapshot,
      handleMoveApplied,
      handleMoveRejected,
      handlePeerConnectionState,
      matchId,
      resetOpponentConnectionState,
      roomId,
      setOnlineSession,
      userId,
    ],
  );

  const { transportError, transportState } = useRealtimeTransport({
    roomId,
    enabled,
    onSocketReady: bindSocketEvents,
  });

  useEffect(() => {
    setGameMode(GAME_MODE.ONLINE_PRIVATE);
  }, [setGameMode]);

  useEffect(() => {
    setError(transportError);
  }, [transportError]);

  useEffect(() => {
    if (!enabled) {
      resetPendingMoveState();
      clearOnlineSession();
    }
  }, [clearOnlineSession, enabled, resetPendingMoveState]);

  useEffect(() => {
    return () => {
      snapshotRef.current = null;
    };
  }, []);

  const status = deriveOnlineUiStatus({
    transportState,
    mySeat,
    movePending,
    opponentConnectionState,
    error,
  });

  return {
    error,
    movePending,
    status,
    transportState,
    sendMove,
    opponentDisconnected,
    opponentDisconnectDeadlineMs,
    opponentConnectionState,
  };
}
