"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { applyMove, getAvailableColumns, getGameStatus, scoreBoard } from "@/features/game/core/rules";
import { GAME_MODE, GAME_RESULT, GAME_STATUS, PLAYER } from "@/features/game/core/types";
import type { Board, DieValue, GamePhase, GameWinner, PlayerScores } from "@/features/game/core/types";
import { fetchRealtimeRoomToken } from "@/features/online/api";
import {
  ONLINE_SOCKET_EVENT,
  type MatchFinishedEvent,
  type MoveAppliedEvent,
  type PeerConnectionStateEvent,
  type MoveRejectedEvent,
  type MoveSubmitEvent,
  type SyncResponseEvent,
} from "@/features/online/socket-events";
import { useGameStore } from "@/features/game/store/use-game-store";

type OnlineSnapshot = {
  roomId: string;
  matchId: string;
  revision: number;
  phase: GamePhase;
  currentRoll: DieValue | null;
  playerBoard: Board;
  botBoard: Board;
  scores: PlayerScores;
  winner: GameWinner | null;
  turnUserId: string | null;
  players: { seat1: string; seat2: string };
};

type OpponentConnectionState = "connected" | "disconnected" | "left_match";

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
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const snapshotRef = useRef<OnlineSnapshot | null>(null);
  const movePendingRef = useRef(false);
  const pendingMoveRef = useRef<{
    clientMoveId: string;
    previousSnapshot: OnlineSnapshot;
  } | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [opponentDisconnectDeadlineMs, setOpponentDisconnectDeadlineMs] = useState<number | null>(null);
  const [opponentConnectionState, setOpponentConnectionState] = useState<OpponentConnectionState>("connected");

  function createClientMoveId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

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
          snapshotRef.current = snapshot;
          const seat = snapshot.players.seat1 === userId ? 1 : 2;
          setOnlineSession({ roomId, seat });
          applyOnlineServerState({
            playerBoard: snapshot.playerBoard,
            botBoard: snapshot.botBoard,
            currentRoll: snapshot.currentRoll,
            phase: snapshot.phase,
            scores: snapshot.scores,
            winner: snapshot.winner,
            revision: snapshot.revision,
            turnUserId: snapshot.turnUserId,
          });
          setOpponentDisconnected(false);
          setOpponentDisconnectDeadlineMs(null);
          setOpponentConnectionState("connected");
        });

        socket.on(ONLINE_SOCKET_EVENT.MOVE_APPLIED, (payload: MoveAppliedEvent) => {
          const snapshot = payload?.snapshot as OnlineSnapshot | undefined;
          if (!snapshot) {
            return;
          }

          snapshotRef.current = snapshot;
          applyOnlineServerState({
            playerBoard: snapshot.playerBoard,
            botBoard: snapshot.botBoard,
            currentRoll: snapshot.currentRoll,
            phase: snapshot.phase,
            scores: snapshot.scores,
            winner: snapshot.winner,
            revision: snapshot.revision,
            turnUserId: snapshot.turnUserId,
          });
          if (pendingMoveRef.current && pendingMoveRef.current.clientMoveId === payload.clientMoveId) {
            pendingMoveRef.current = null;
            movePendingRef.current = false;
          }
        });

        socket.on(ONLINE_SOCKET_EVENT.MOVE_REJECTED, (payload: MoveRejectedEvent) => {
          const pendingMove = pendingMoveRef.current;
          if (pendingMove && pendingMove.clientMoveId === payload.clientMoveId) {
            snapshotRef.current = pendingMove.previousSnapshot;
            applyOnlineServerState({
              playerBoard: pendingMove.previousSnapshot.playerBoard,
              botBoard: pendingMove.previousSnapshot.botBoard,
              currentRoll: pendingMove.previousSnapshot.currentRoll,
              phase: pendingMove.previousSnapshot.phase,
              scores: pendingMove.previousSnapshot.scores,
              winner: pendingMove.previousSnapshot.winner,
              revision: pendingMove.previousSnapshot.revision,
              turnUserId: pendingMove.previousSnapshot.turnUserId,
            });
            pendingMoveRef.current = null;
            movePendingRef.current = false;
          }
          setError(`Move rejected: ${payload.reason}`);
        });

        socket.on(ONLINE_SOCKET_EVENT.MATCH_FINISHED, (payload: MatchFinishedEvent) => {
          const snapshot = payload?.snapshot as OnlineSnapshot | undefined;
          if (!snapshot) {
            return;
          }

          snapshotRef.current = snapshot;
          applyOnlineServerState({
            playerBoard: snapshot.playerBoard,
            botBoard: snapshot.botBoard,
            currentRoll: snapshot.currentRoll,
            phase: snapshot.phase,
            scores: snapshot.scores,
            winner: snapshot.winner,
            revision: snapshot.revision,
            turnUserId: snapshot.turnUserId,
          });
          setOpponentDisconnected(false);
          setOpponentDisconnectDeadlineMs(null);
          setOpponentConnectionState("connected");
        });

        socket.on(ONLINE_SOCKET_EVENT.PEER_CONNECTION_STATE, (payload: PeerConnectionStateEvent) => {
          if (!payload || payload.userId === userId) {
            return;
          }

          if (payload.connected) {
            setOpponentDisconnected(false);
            setOpponentDisconnectDeadlineMs(null);
            setOpponentConnectionState("connected");
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
        });
      } catch (setupError) {
        if (!disposed) {
          setError(setupError instanceof Error ? setupError.message : "Socket setup failed");
        }
      }
    })();

    return () => {
      disposed = true;
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
    matchId,
    roomId,
    setGameMode,
    setOnlineConnectionState,
    setOnlineSession,
    userId,
    enabled,
  ]);

  async function sendMove(columnIndex: 0 | 1 | 2) {
    if (movePendingRef.current) {
      return;
    }

    setError(null);

    const previousSnapshot = snapshotRef.current;
    const currentSnapshot = snapshotRef.current;

    if (currentSnapshot && currentSnapshot.turnUserId === userId && currentSnapshot.currentRoll !== null) {
      const isSeat1 = currentSnapshot.players.seat1 === userId;
      const currentBoard = isSeat1 ? currentSnapshot.playerBoard : currentSnapshot.botBoard;
      const opponentBoard = isSeat1 ? currentSnapshot.botBoard : currentSnapshot.playerBoard;
      const availableColumns = getAvailableColumns(currentBoard);

      if (availableColumns.includes(columnIndex)) {
        const moveResult = applyMove({
          currentBoard,
          opponentBoard,
          columnIndex,
          dieValue: currentSnapshot.currentRoll,
        });

        const nextPlayerBoard = isSeat1 ? moveResult.nextCurrentBoard : moveResult.nextOpponentBoard;
        const nextBotBoard = isSeat1 ? moveResult.nextOpponentBoard : moveResult.nextCurrentBoard;
        const nextScores: PlayerScores = {
          player: scoreBoard(nextPlayerBoard),
          bot: scoreBoard(nextBotBoard),
        };
        const nextStatus = getGameStatus({
          player: nextPlayerBoard,
          bot: nextBotBoard,
        });
        const finished = nextStatus === GAME_STATUS.FINISHED;
        const nextWinner: GameWinner | null = finished
          ? nextScores.player > nextScores.bot
            ? PLAYER.PLAYER
            : nextScores.player < nextScores.bot
              ? PLAYER.BOT
              : GAME_RESULT.DRAW
          : null;

        const optimisticSnapshot: OnlineSnapshot = {
          ...currentSnapshot,
          revision: currentSnapshot.revision + 1,
          phase: finished ? "finished" : "player_turn",
          currentRoll: null,
          playerBoard: nextPlayerBoard,
          botBoard: nextBotBoard,
          scores: nextScores,
          winner: nextWinner,
          turnUserId: finished ? null : isSeat1 ? currentSnapshot.players.seat2 : currentSnapshot.players.seat1,
        };

        snapshotRef.current = optimisticSnapshot;
        applyOnlineServerState({
          playerBoard: optimisticSnapshot.playerBoard,
          botBoard: optimisticSnapshot.botBoard,
          currentRoll: optimisticSnapshot.currentRoll,
          phase: optimisticSnapshot.phase,
          scores: optimisticSnapshot.scores,
          winner: optimisticSnapshot.winner,
          revision: optimisticSnapshot.revision,
          turnUserId: optimisticSnapshot.turnUserId,
        });
      } else {
        return;
      }
    } else {
      return;
    }

    movePendingRef.current = true;
    if (!previousSnapshot) {
      movePendingRef.current = false;
      return;
    }

    const clientMoveId = createClientMoveId();
    pendingMoveRef.current = {
      clientMoveId,
      previousSnapshot,
    };

    const payload: MoveSubmitEvent = {
      roomId,
      matchId,
      columnIndex,
      expectedRevision: previousSnapshot.revision,
      clientMoveId,
      submittedAt: Date.now(),
    };
    socketRef.current?.emit(ONLINE_SOCKET_EVENT.MOVE_SUBMIT, payload);
  }

  return {
    error,
    sendMove,
    opponentDisconnected,
    opponentDisconnectDeadlineMs,
    opponentConnectionState,
  };
}
