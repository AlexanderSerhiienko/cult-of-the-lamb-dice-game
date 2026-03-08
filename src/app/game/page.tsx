"use client";

import { getAvailableColumns } from "@/features/game/core/rules";
import { BoardsStack } from "@/features/game/components/boards-stack";
import { GameSideRail } from "@/features/game/components/game-side-rail";
import { GameResultModal } from "@/features/game/components/game-result-modal";
import { useBotTurnEffect } from "@/features/game/hooks/use-bot-turn-effect";
import { useGameStore } from "@/features/game/store/use-game-store";

function getResultText(winner: ReturnType<typeof useGameStore.getState>["winner"]) {
  switch (winner) {
    case "player":
      return "Victory";
    case "bot":
      return "Defeat";
    case "draw":
      return "Draw";
    default:
      return null;
  }
}

function getPlayerAvailableColumns(params: {
  phase: string;
  currentRoll: number | null;
  interactionLocked: boolean;
  playerBoard: ReturnType<typeof useGameStore.getState>["playerBoard"];
}) {
  const { phase, currentRoll, interactionLocked, playerBoard } = params;

  if (phase === "player_turn" && currentRoll !== null && !interactionLocked) {
    return getAvailableColumns(playerBoard);
  }

  return [];
}

export default function GamePage() {
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

  useBotTurnEffect({ phase, botMove });

  const playerAvailableColumns = getPlayerAvailableColumns({
    phase,
    currentRoll,
    interactionLocked,
    playerBoard,
  });
  const gameFinished = phase === "finished";
  const playerCurrentDie = phase === "player_turn" ? currentRoll : null;
  const botCurrentDie = phase === "bot_turn" ? currentRoll : null;
  const resultText = getResultText(winner);

  return (
    <section className="h-[calc(100vh-7.5rem)]">
      <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_220px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <GameSideRail
          scoreLabel="Your score"
          scoreValue={scores.player}
          scoreTone="player"
          dieLabel="Your die"
          dieValue={playerCurrentDie}
          isActiveTurn={phase === "player_turn"}
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
          scoreTone="bot"
          dieLabel="Bot die"
          dieValue={botCurrentDie}
          isActiveTurn={phase === "bot_turn"}
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
