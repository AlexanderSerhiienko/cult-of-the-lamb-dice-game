"use client";

import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import type { Socket } from "socket.io-client";
import { applyMove, getAvailableColumns, getGameStatus, scoreBoard } from "@/features/game/core/rules";
import { GAME_RESULT, GAME_STATUS, PLAYER } from "@/features/game/core/types";
import type { GameStoreActions } from "@/features/game/store/types/game-store";
import { ONLINE_SOCKET_EVENT, type MoveAppliedEvent, type MoveRejectedEvent, type MoveSubmitEvent } from "@/features/online/socket-events";
import { applySnapshotToGameStore } from "@/features/online/store-sync";
import type { OnlineSnapshot } from "@/features/online/types";

function createClientMoveId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildOptimisticSnapshot(params: {
  snapshot: OnlineSnapshot;
  userId: string;
  columnIndex: 0 | 1 | 2;
}): OnlineSnapshot | null {
  const { snapshot, userId, columnIndex } = params;
  if (snapshot.turnUserId !== userId || snapshot.currentRoll === null) {
    return null;
  }

  const isSeat1 = snapshot.players.seat1 === userId;
  const currentBoard = isSeat1 ? snapshot.playerBoard : snapshot.botBoard;
  const opponentBoard = isSeat1 ? snapshot.botBoard : snapshot.playerBoard;
  const availableColumns = getAvailableColumns(currentBoard);
  if (!availableColumns.includes(columnIndex)) {
    return null;
  }

  const moveResult = applyMove({
    currentBoard,
    opponentBoard,
    columnIndex,
    dieValue: snapshot.currentRoll,
  });

  const nextPlayerBoard = isSeat1 ? moveResult.nextCurrentBoard : moveResult.nextOpponentBoard;
  const nextBotBoard = isSeat1 ? moveResult.nextOpponentBoard : moveResult.nextCurrentBoard;
  const nextScores = {
    player: scoreBoard(nextPlayerBoard),
    bot: scoreBoard(nextBotBoard),
  };
  const nextStatus = getGameStatus({
    player: nextPlayerBoard,
    bot: nextBotBoard,
  });
  const finished = nextStatus === GAME_STATUS.FINISHED;
  const nextWinner =
    finished && nextScores.player > nextScores.bot
      ? PLAYER.PLAYER
      : finished && nextScores.player < nextScores.bot
        ? PLAYER.BOT
        : finished
          ? GAME_RESULT.DRAW
          : null;

  return {
    ...snapshot,
    revision: snapshot.revision + 1,
    phase: finished ? "finished" : "player_turn",
    currentRoll: null,
    playerBoard: nextPlayerBoard,
    botBoard: nextBotBoard,
    scores: nextScores,
    winner: nextWinner,
    turnUserId: finished ? null : isSeat1 ? snapshot.players.seat2 : snapshot.players.seat1,
  };
}

export function useOnlineMoveSubmission(params: {
  roomId: string;
  matchId: string;
  userId: string;
  socketRef: RefObject<Socket | null>;
  snapshotRef: RefObject<OnlineSnapshot | null>;
  applyOnlineServerState: GameStoreActions["applyOnlineServerState"];
  setError: (value: string | null) => void;
}) {
  const { roomId, matchId, userId, socketRef, snapshotRef, applyOnlineServerState, setError } = params;
  const movePendingRef = useRef(false);
  const pendingMoveRef = useRef<{
    clientMoveId: string;
    previousSnapshot: OnlineSnapshot;
  } | null>(null);

  const commitSnapshot = useCallback((snapshot: OnlineSnapshot) => {
    snapshotRef.current = snapshot;
    applySnapshotToGameStore({
      snapshot,
      applyOnlineServerState,
    });
  }, [applyOnlineServerState, snapshotRef]);

  const handleMoveApplied = useCallback(
    (payload: MoveAppliedEvent) => {
      const snapshot = payload?.snapshot as OnlineSnapshot | undefined;
      if (!snapshot) {
        return;
      }

      commitSnapshot(snapshot);
      if (pendingMoveRef.current && pendingMoveRef.current.clientMoveId === payload.clientMoveId) {
        pendingMoveRef.current = null;
        movePendingRef.current = false;
      }
    },
    [commitSnapshot],
  );

  const handleMoveRejected = useCallback(
    (payload: MoveRejectedEvent) => {
      const pendingMove = pendingMoveRef.current;
      if (pendingMove && pendingMove.clientMoveId === payload.clientMoveId) {
        commitSnapshot(pendingMove.previousSnapshot);
        pendingMoveRef.current = null;
        movePendingRef.current = false;
      }

      setError(`Move rejected: ${payload.reason}`);
    },
    [commitSnapshot, setError],
  );

  const resetPendingMoveState = useCallback(() => {
    pendingMoveRef.current = null;
    movePendingRef.current = false;
  }, []);

  const sendMove = useCallback(
    async (columnIndex: 0 | 1 | 2) => {
      if (movePendingRef.current) {
        return;
      }

      setError(null);

      const previousSnapshot = snapshotRef.current;
      if (!previousSnapshot) {
        return;
      }

      const optimisticSnapshot = buildOptimisticSnapshot({
        snapshot: previousSnapshot,
        userId,
        columnIndex,
      });
      if (!optimisticSnapshot) {
        return;
      }

      movePendingRef.current = true;
      const clientMoveId = createClientMoveId();
      pendingMoveRef.current = {
        clientMoveId,
        previousSnapshot,
      };

      commitSnapshot(optimisticSnapshot);

      const payload: MoveSubmitEvent = {
        roomId,
        matchId,
        columnIndex,
        expectedRevision: previousSnapshot.revision,
        clientMoveId,
        submittedAt: Date.now(),
      };
      socketRef.current?.emit(ONLINE_SOCKET_EVENT.MOVE_SUBMIT, payload);
    },
    [commitSnapshot, matchId, roomId, setError, snapshotRef, socketRef, userId],
  );

  return {
    commitSnapshot,
    handleMoveApplied,
    handleMoveRejected,
    resetPendingMoveState,
    sendMove,
  };
}
