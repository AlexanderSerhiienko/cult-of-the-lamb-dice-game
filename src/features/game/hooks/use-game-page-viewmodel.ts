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
  playerBoard: ReturnType<typeof useGameStore.getState>["playerBoard"];
  botBoard: ReturnType<typeof useGameStore.getState>["botBoard"];
}) {
  const { phase, gameMode, currentRoll, interactionLocked, playerBoard, botBoard } = params;

  if (currentRoll === null || interactionLocked) {
    return { playerAvailableColumns: [], botAvailableColumns: [] };
  }

  if (phase === GAME_PHASE.PLAYER_TURN) {
    return { playerAvailableColumns: getAvailableColumns(playerBoard), botAvailableColumns: [] };
  }

  if (phase === GAME_PHASE.BOT_TURN && gameMode === GAME_MODE.LOCAL_PVP) {
    return { playerAvailableColumns: [], botAvailableColumns: getAvailableColumns(botBoard) };
  }

  return { playerAvailableColumns: [], botAvailableColumns: [] };
}

function getLabels(gameMode: GameMode) {
  if (gameMode === GAME_MODE.LOCAL_PVP) {
    return {
      playerScoreLabel: "Player 1 score",
      playerDieLabel: "Player 1 die",
      opponentScoreLabel: "Player 2 score",
      opponentDieLabel: "Player 2 die",
      playerBoardTitle: "Player 1 board",
      opponentBoardTitle: "Player 2 board",
    };
  }

  return {
    playerScoreLabel: "Your score",
    playerDieLabel: "Your die",
    opponentScoreLabel: "Bot score",
    opponentDieLabel: "Bot die",
    playerBoardTitle: "Player board",
    opponentBoardTitle: "Bot board",
  };
}

export function useGamePageViewModel() {
  const playerBoard = useGameStore((state) => state.playerBoard);
  const botBoard = useGameStore((state) => state.botBoard);
  const currentRoll = useGameStore((state) => state.currentRoll);
  const scores = useGameStore((state) => state.scores);
  const phase = useGameStore((state) => state.phase);
  const gameMode = useGameStore((state) => state.gameMode);
  const interactionLocked = useGameStore((state) => state.interactionLocked);
  const winner = useGameStore((state) => state.winner);
  const rematch = useGameStore((state) => state.rematch);
  const placePlayerDie = useGameStore((state) => state.placePlayerDie);
  const botMove = useGameStore((state) => state.botMove);

  const { playerAvailableColumns, botAvailableColumns } = getAvailableColumnsByBoard({
    phase,
    gameMode,
    currentRoll,
    interactionLocked,
    playerBoard,
    botBoard,
  });
  const gameFinished = phase === GAME_PHASE.FINISHED;
  const playerCurrentDie = phase === GAME_PHASE.PLAYER_TURN ? currentRoll : null;
  const botCurrentDie = phase === GAME_PHASE.BOT_TURN ? currentRoll : null;
  const resultText = getResultText({ winner, gameMode });
  const {
    playerScoreLabel,
    playerDieLabel,
    opponentScoreLabel,
    opponentDieLabel,
    playerBoardTitle,
    opponentBoardTitle,
  } = getLabels(gameMode);

  return {
    playerBoard,
    botBoard,
    scores,
    phase,
    gameFinished,
    playerCurrentDie,
    botCurrentDie,
    resultText,
    playerAvailableColumns,
    botAvailableColumns,
    playerScoreLabel,
    playerDieLabel,
    opponentScoreLabel,
    opponentDieLabel,
    playerBoardTitle,
    opponentBoardTitle,
    rematch,
    placePlayerDie,
    botMove,
  };
}
