"use client";

import { useEffect } from "react";
import type { GameMode } from "@/features/game/core/types";
import { GamePageContent } from "@/features/game/components/game-page-content";
import { useGameStore } from "@/features/game/store/use-game-store";

type GameModePageProps = {
  mode: GameMode;
};

export function GameModePage({ mode }: GameModePageProps) {
  const gameMode = useGameStore((state) => state.gameMode);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const resetGame = useGameStore((state) => state.resetGame);

  useEffect(() => {
    if (gameMode === mode) {
      return;
    }

    setGameMode(mode);
    resetGame();
  }, [gameMode, mode, resetGame, setGameMode]);

  if (gameMode !== mode) {
    return null;
  }

  return <GamePageContent mode={mode} />;
}
