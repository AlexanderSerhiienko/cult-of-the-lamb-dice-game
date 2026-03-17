"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { GAME_MODE } from "@/features/game/core/types";
import { fetchRealtimeRoomToken } from "@/features/online/api";
import {
  ONLINE_SOCKET_EVENT,
  type MatchFinishedEvent,
  type PeerConnectionStateEvent,
  type SyncResponseEvent,
} from "@/features/online/socket-events";
import { useOnlineMoveSubmission } from "@/features/online/hooks/use-online-move-submission";
import { useOpponentConnectionState } from "@/features/online/hooks/use-opponent-connection-state";
import { getOnlineSeat } from "@/features/online/store-sync";
import type { OnlineSnapshot } from "@/features/online/types";
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
  const setOnlineConnectionState = useGameStore((state) => state.setOnlineConnectionState);
  const setOnlineSession = useGameStore((state) => state.setOnlineSession);
  const clearOnlineSession = useGameStore((state) => state.clearOnlineSession);
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
  const { commitSnapshot, handleMoveApplied, handleMoveRejected, resetPendingMoveState, sendMove } =
    useOnlineMoveSubmission({
      roomId,
      matchId,
      userId,
      socketRef,
      snapshotRef,
      applyOnlineServerState,
      setError,
    });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;
    setGameMode(GAME_MODE.ONLINE_PRIVATE);

    void (async () => {
      try {
        const { token, realtimeUrl } = await fetchRealtimeRoomToken(roomId);
        if (disposed) {
          return;
        }

        const socket = io(realtimeUrl, {
          transports: ["websocket"],
          auth: { token },
        });
        socketRef.current = socket;

        socket.on("connect_error", (connectError: Error) => {
          setOnlineConnectionState(false);
          setError(connectError.message || "Failed to connect realtime service");
        });

        socket.on("connect", () => {
          setError(null);
          setOnlineConnectionState(true);
          socket.emit(ONLINE_SOCKET_EVENT.SYNC_REQUEST, {
            roomId,
            matchId,
            lastSeenRevision: useGameStore.getState().onlineRevision,
          });
        });

        socket.on("disconnect", () => {
          setOnlineConnectionState(false);
        });

        socket.on(ONLINE_SOCKET_EVENT.SYNC_RESPONSE, (payload: SyncResponseEvent) => {
          if (!payload?.snapshot) {
            return;
          }
          const snapshot = payload.snapshot as OnlineSnapshot;
          const seat = getOnlineSeat(snapshot, userId);
          setOnlineSession({ roomId, seat });
          commitSnapshot(snapshot);
          resetOpponentConnectionState();
        });

        socket.on(ONLINE_SOCKET_EVENT.MOVE_APPLIED, handleMoveApplied);

        socket.on(ONLINE_SOCKET_EVENT.MOVE_REJECTED, handleMoveRejected);

        socket.on(ONLINE_SOCKET_EVENT.MATCH_FINISHED, (payload: MatchFinishedEvent) => {
          const snapshot = payload?.snapshot as OnlineSnapshot | undefined;
          if (!snapshot) {
            return;
          }

          commitSnapshot(snapshot);
          resetOpponentConnectionState();
        });

        socket.on(ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE, (payload: PeerConnectionStateEvent) => {
          handlePeerConnectionState(payload);
        });
      } catch (setupError) {
        if (!disposed) {
          setError(setupError instanceof Error ? setupError.message : "Socket setup failed");
        }
      }
    })();

    return () => {
      disposed = true;
      resetPendingMoveState();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      clearOnlineSession();
      setOnlineConnectionState(false);
    };
  }, [
    applyOnlineServerState,
    clearOnlineSession,
    commitSnapshot,
    enabled,
    handleMoveApplied,
    handleMoveRejected,
    handlePeerConnectionState,
    matchId,
    resetOpponentConnectionState,
    resetPendingMoveState,
    roomId,
    setGameMode,
    setOnlineConnectionState,
    setOnlineSession,
    userId,
  ]);

  useEffect(() => {
    return () => {
      snapshotRef.current = null;
    };
  }, []);

  return {
    error,
    sendMove,
    opponentDisconnected,
    opponentDisconnectDeadlineMs,
    opponentConnectionState,
  };
}
