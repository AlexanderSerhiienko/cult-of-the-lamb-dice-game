"use client";

import { GAME_PHASE, PLAYER } from "@/features/game/core/types";
import { BoardsStack } from "@/features/game/components/boards-stack";
import { GameSideRail } from "@/features/game/components/game-side-rail";
import { GameResultModal } from "@/features/game/components/game-result-modal";
import { useBotTurnEffect } from "@/features/game/hooks/use-bot-turn-effect";
import { useGamePageViewModel } from "@/features/game/hooks/use-game-page-viewmodel";

export default function GamePage() {
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
    rematch,
    placePlayerDie,
    botMove,
  } = useGamePageViewModel();

  useBotTurnEffect({ phase, botMove });

  return (
    <section className="h-[calc(100vh-7.5rem)]">
      <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_220px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <GameSideRail
          scoreLabel="Your score"
          scoreValue={scores.player}
          scoreTone={PLAYER.PLAYER}
          dieLabel="Your die"
          dieValue={playerCurrentDie}
          isActiveTurn={phase === GAME_PHASE.PLAYER_TURN}
        />

        <BoardsStack
          botBoard={botBoard}
          playerBoard={playerBoard}
          phase={phase}
          playerAvailableColumns={playerAvailableColumns}
          onSelectColumn={placePlayerDie}
        />

        <GameSideRail
          scoreLabel="Bot score"
          scoreValue={scores.bot}
          scoreTone={PLAYER.BOT}
          dieLabel="Bot die"
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
