"use client";

import { GAME_MODE, GAME_PHASE, PLAYER } from "@/features/game/core/types";
import type { GameMode } from "@/features/game/core/types";
import { BoardsStack } from "@/features/game/components/boards-stack";
import { GameResultModal } from "@/features/game/components/game-result-modal";
import { GameSideRail } from "@/features/game/components/game-side-rail";
import { useBotTurnEffect } from "@/features/game/hooks/use-bot-turn-effect";
import { useGamePageViewModel } from "@/features/game/hooks/use-game-page-viewmodel";
import { useMatchReportEffect } from "@/features/game/hooks/use-match-report-effect";

type GamePageContentProps = {
  mode: GameMode;
};

export function GamePageContent({ mode }: GamePageContentProps) {
  const {
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
  } = useGamePageViewModel();

  useBotTurnEffect({ phase, botMove, enabled: mode === GAME_MODE.PVB });
  useMatchReportEffect();

  return (
    <section className="h-[calc(100vh-7.5rem)]">
      <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_220px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <GameSideRail
          scoreLabel={seat1ScoreLabel}
          scoreValue={seatScores.seat1}
          scoreTone={PLAYER.PLAYER}
          dieLabel={seat1DieLabel}
          dieValue={seat1CurrentDie}
          isActiveTurn={phase === GAME_PHASE.PLAYER_TURN}
        />

        <BoardsStack
          upperBoard={seat2Board}
          lowerBoard={seat1Board}
          phase={phase}
          upperBoardTitle={seat2BoardTitle}
          lowerBoardTitle={seat1BoardTitle}
          upperAvailableColumns={seat2AvailableColumns}
          lowerAvailableColumns={seat1AvailableColumns}
          onSelectColumn={placePlayerDie}
          upperBoardSelectable={mode === GAME_MODE.LOCAL_PVP}
        />

        <GameSideRail
          scoreLabel={seat2ScoreLabel}
          scoreValue={seatScores.seat2}
          scoreTone={PLAYER.BOT}
          dieLabel={seat2DieLabel}
          dieValue={seat2CurrentDie}
          isActiveTurn={phase === GAME_PHASE.BOT_TURN}
        />
      </div>

      {gameFinished && resultText ? (
        <GameResultModal
          isOpen
          resultText={resultText}
          playerScore={seatScores.seat1}
          botScore={seatScores.seat2}
          onRematch={rematch}
          onClose={rematch}
        />
      ) : null}
    </section>
  );
}
