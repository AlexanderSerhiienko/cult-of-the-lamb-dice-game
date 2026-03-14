"use client";

import { GAME_MODE, GAME_PHASE, PLAYER } from "@/features/game/core/types";
import type { GameMode } from "@/features/game/core/types";
import { BoardsStack } from "@/features/game/components/boards-stack";
import { GameResultModal } from "@/features/game/components/game-result-modal";
import { GameSideRail } from "@/features/game/components/game-side-rail";
import { useBotTurnEffect } from "@/features/game/hooks/use-bot-turn-effect";
import { useGamePageViewModel } from "@/features/game/hooks/use-game-page-viewmodel";

type GamePageContentProps = {
  mode: GameMode;
};

export function GamePageContent({ mode }: GamePageContentProps) {
  const {
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
  } = useGamePageViewModel();

  useBotTurnEffect({ phase, botMove, enabled: mode === GAME_MODE.PVB });

  return (
    <section className="h-[calc(100vh-7.5rem)]">
      <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_220px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <GameSideRail
          scoreLabel={playerScoreLabel}
          scoreValue={scores.player}
          scoreTone={PLAYER.PLAYER}
          dieLabel={playerDieLabel}
          dieValue={playerCurrentDie}
          isActiveTurn={phase === GAME_PHASE.PLAYER_TURN}
        />

        <BoardsStack
          botBoard={botBoard}
          playerBoard={playerBoard}
          phase={phase}
          botBoardTitle={opponentBoardTitle}
          playerBoardTitle={playerBoardTitle}
          botAvailableColumns={botAvailableColumns}
          playerAvailableColumns={playerAvailableColumns}
          onSelectColumn={placePlayerDie}
          botBoardSelectable={mode === GAME_MODE.LOCAL_PVP}
        />

        <GameSideRail
          scoreLabel={opponentScoreLabel}
          scoreValue={scores.bot}
          scoreTone={PLAYER.BOT}
          dieLabel={opponentDieLabel}
          dieValue={botCurrentDie}
          isActiveTurn={phase === GAME_PHASE.BOT_TURN}
        />
      </div>

      {gameFinished && resultText ? (
        <GameResultModal
          isOpen
          resultText={resultText}
          playerScore={scores.player}
          botScore={scores.bot}
          onRematch={rematch}
          onClose={rematch}
        />
      ) : null}
    </section>
  );
}
