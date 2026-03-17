"use client";

import { getAvailableColumns } from "@/features/game/core/rules";
import { GAME_MODE, GAME_PHASE, GAME_RESULT, PLAYER } from "@/features/game/core/types";
import type { GameMode, GamePhase } from "@/features/game/core/types";
import { useGameStore } from "@/features/game/store/use-game-store";

function getResultText(params: {
  winner: ReturnType<typeof useGameStore.getState>["winner"];
  gameMode: GameMode;
}) {
  const { winner, gameMode } = params;

  switch (winner) {
    case PLAYER.PLAYER:
      return gameMode === GAME_MODE.LOCAL_PVP ? "Player 1 wins" : "Victory";
    case PLAYER.BOT:
      return gameMode === GAME_MODE.LOCAL_PVP ? "Player 2 wins" : "Defeat";
    case GAME_RESULT.DRAW:
      return "Draw";
    default:
      return null;
  }
}

function getAvailableColumnsByBoard(params: {
  phase: GamePhase;
  gameMode: GameMode;
  currentRoll: number | null;
  interactionLocked: boolean;
  seat1Board: ReturnType<typeof useGameStore.getState>["seat1Board"];
  seat2Board: ReturnType<typeof useGameStore.getState>["seat2Board"];
}) {
  const { phase, gameMode, currentRoll, interactionLocked, seat1Board, seat2Board } = params;

  if (currentRoll === null || interactionLocked) {
    return { seat1AvailableColumns: [], seat2AvailableColumns: [] };
  }

  if (phase === GAME_PHASE.PLAYER_TURN) {
    return { seat1AvailableColumns: getAvailableColumns(seat1Board), seat2AvailableColumns: [] };
  }

  if (phase === GAME_PHASE.BOT_TURN && gameMode === GAME_MODE.LOCAL_PVP) {
    return { seat1AvailableColumns: [], seat2AvailableColumns: getAvailableColumns(seat2Board) };
  }

  return { seat1AvailableColumns: [], seat2AvailableColumns: [] };
}

function getLabels(gameMode: GameMode) {
  if (gameMode === GAME_MODE.LOCAL_PVP) {
    return {
      seat1ScoreLabel: "Player 1 score",
      seat1DieLabel: "Player 1 die",
      seat2ScoreLabel: "Player 2 score",
      seat2DieLabel: "Player 2 die",
      seat1BoardTitle: "Player 1 board",
      seat2BoardTitle: "Player 2 board",
    };
  }

  if (gameMode === GAME_MODE.ONLINE_PRIVATE) {
    return {
      seat1ScoreLabel: "Your score",
      seat1DieLabel: "Your die",
      seat2ScoreLabel: "Opponent score",
      seat2DieLabel: "Opponent die",
      seat1BoardTitle: "Your board",
      seat2BoardTitle: "Opponent board",
    };
  }

  return {
    seat1ScoreLabel: "Your score",
    seat1DieLabel: "Your die",
    seat2ScoreLabel: "Bot score",
    seat2DieLabel: "Bot die",
    seat1BoardTitle: "Player board",
    seat2BoardTitle: "Bot board",
  };
}

export function useGamePageViewModel() {
  const seat1Board = useGameStore((state) => state.seat1Board);
  const seat2Board = useGameStore((state) => state.seat2Board);
  const currentRoll = useGameStore((state) => state.currentRoll);
  const seatScores = useGameStore((state) => state.seatScores);
  const phase = useGameStore((state) => state.phase);
  const gameMode = useGameStore((state) => state.gameMode);
  const interactionLocked = useGameStore((state) => state.interactionLocked);
  const winner = useGameStore((state) => state.winner);
  const rematch = useGameStore((state) => state.rematch);
  const placePlayerDie = useGameStore((state) => state.placePlayerDie);
  const botMove = useGameStore((state) => state.botMove);

  const { seat1AvailableColumns, seat2AvailableColumns } = getAvailableColumnsByBoard({
    phase,
    gameMode,
    currentRoll,
    interactionLocked,
    seat1Board,
    seat2Board,
  });
  const gameFinished = phase === GAME_PHASE.FINISHED;
  const seat1CurrentDie = phase === GAME_PHASE.PLAYER_TURN ? currentRoll : null;
  const seat2CurrentDie = phase === GAME_PHASE.BOT_TURN ? currentRoll : null;
  const resultText = getResultText({ winner, gameMode });
  const {
    seat1ScoreLabel,
    seat1DieLabel,
    seat2ScoreLabel,
    seat2DieLabel,
    seat1BoardTitle,
    seat2BoardTitle,
  } = getLabels(gameMode);

  return {
    seat1Board,
    seat2Board,
    seatScores,
    phase,
    gameFinished,
    seat1CurrentDie,
    seat2CurrentDie,
    resultText,
    seat1AvailableColumns,
    seat2AvailableColumns,
    seat1ScoreLabel,
    seat1DieLabel,
    seat2ScoreLabel,
    seat2DieLabel,
    seat1BoardTitle,
    seat2BoardTitle,
    rematch,
    placePlayerDie,
    botMove,
  };
}
