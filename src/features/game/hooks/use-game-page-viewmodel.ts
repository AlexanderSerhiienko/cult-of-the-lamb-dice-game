"use client";

import { getAvailableColumns } from "@/features/game/core/rules";
import { GAME_PHASE, GAME_RESULT } from "@/features/game/core/types";
import type { GamePhase } from "@/features/game/core/types";
import { PLAYER } from "@/features/game/core/types";
import { useGameStore } from "@/features/game/store/use-game-store";

function getResultText(winner: ReturnType<typeof useGameStore.getState>["winner"]) {
  switch (winner) {
    case PLAYER.PLAYER:
      return "Victory";
    case PLAYER.BOT:
      return "Defeat";
    case GAME_RESULT.DRAW:
      return "Draw";
    default:
      return null;
  }
}

function getPlayerAvailableColumns(params: {
  phase: GamePhase;
  currentRoll: number | null;
  interactionLocked: boolean;
  playerBoard: ReturnType<typeof useGameStore.getState>["playerBoard"];
}) {
  const { phase, currentRoll, interactionLocked, playerBoard } = params;

  if (phase === GAME_PHASE.PLAYER_TURN && currentRoll !== null && !interactionLocked) {
    return getAvailableColumns(playerBoard);
  }

  return [];
}

export function useGamePageViewModel() {
  const playerBoard = useGameStore((state) => state.playerBoard);
  const botBoard = useGameStore((state) => state.botBoard);
  const currentRoll = useGameStore((state) => state.currentRoll);
  const scores = useGameStore((state) => state.scores);
  const phase = useGameStore((state) => state.phase);
  const interactionLocked = useGameStore((state) => state.interactionLocked);
  const winner = useGameStore((state) => state.winner);
  const rematch = useGameStore((state) => state.rematch);
  const placePlayerDie = useGameStore((state) => state.placePlayerDie);
  const botMove = useGameStore((state) => state.botMove);

  const playerAvailableColumns = getPlayerAvailableColumns({
    phase,
    currentRoll,
    interactionLocked,
    playerBoard,
  });
  const gameFinished = phase === GAME_PHASE.FINISHED;
  const playerCurrentDie = phase === GAME_PHASE.PLAYER_TURN ? currentRoll : null;
  const botCurrentDie = phase === GAME_PHASE.BOT_TURN ? currentRoll : null;
  const resultText = getResultText(winner);

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
    rematch,
    placePlayerDie,
    botMove,
  };
}
