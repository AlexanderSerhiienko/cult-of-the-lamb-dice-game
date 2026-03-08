"use client";

import { useEffect } from "react";
import { getAvailableColumns } from "@/features/game/core/rules";
import { DiceFace } from "@/features/game/components/dice-face";
import { GameBoard } from "@/features/game/components/game-board";
import { useGameStore } from "@/features/game/store/use-game-store";

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

  useEffect(() => {
    if (phase !== "bot_turn") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      botMove();
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [phase, botMove]);

  const playerAvailableColumns =
    phase === "player_turn" && currentRoll !== null && !interactionLocked
      ? getAvailableColumns(playerBoard)
      : [];
  const gameFinished = phase === "finished";
  const playerCurrentDie = phase === "player_turn" ? currentRoll : null;
  const botCurrentDie = phase === "bot_turn" ? currentRoll : null;
  const resultText =
    winner === "player"
      ? "Victory"
      : winner === "bot"
        ? "Defeat"
        : winner === "draw"
          ? "Draw"
          : null;

  const renderCurrentDie = (die: typeof currentRoll, highlighted = false) => {
    if (die) {
      return <DiceFace value={die} size="sm" highlighted={highlighted} />;
    }

    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-500">
        -
      </div>
    );
  };

  return (
    <section className="h-[calc(100vh-7.5rem)]">
      <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_220px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <aside className="flex h-full flex-col items-center justify-center gap-5">
          <div className="w-full rounded-xl border border-slate-700/80 bg-slate-900/70 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Your score</p>
            <p className="mt-3 text-6xl font-black text-emerald-300">{scores.player}</p>
          </div>
          <div className="w-full rounded-xl border border-slate-700/80 bg-slate-900/70 p-4">
            <p className="text-center text-xs uppercase tracking-[0.16em] text-slate-400">Your die</p>
            <div className="mt-4 flex min-h-14 items-center justify-center">
              {renderCurrentDie(playerCurrentDie, phase === "player_turn")}
            </div>
          </div>
        </aside>

        <main className="mx-auto flex w-fit self-center flex-col gap-4 rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 md:p-5">
          <GameBoard title="Bot board" board={botBoard} isActive={phase === "bot_turn"} />
          <GameBoard
            title="Player board"
            board={playerBoard}
            isActive={phase === "player_turn"}
            isPlayerBoard
            interactiveColumns={playerAvailableColumns}
            onSelectColumn={placePlayerDie}
          />
        </main>

        <aside className="flex h-full flex-col items-center justify-center gap-5">
          <div className="w-full rounded-xl border border-slate-700/80 bg-slate-900/70 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Bot score</p>
            <p className="mt-3 text-6xl font-black text-violet-300">{scores.bot}</p>
          </div>
          <div className="w-full rounded-xl border border-slate-700/80 bg-slate-900/70 p-4">
            <p className="text-center text-xs uppercase tracking-[0.16em] text-slate-400">Bot die</p>
            <div className="mt-4 flex min-h-14 items-center justify-center">
              {renderCurrentDie(botCurrentDie, phase === "bot_turn")}
            </div>
          </div>
        </aside>
      </div>

      {gameFinished && resultText && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-violet-500/40 bg-slate-950 p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-violet-200">{resultText}</h2>
            <p className="mt-2 text-sm text-slate-300">
              Final score: {scores.player} - {scores.bot}
            </p>
            <button
              type="button"
              onClick={rematch}
              className="mt-4 w-full rounded-md bg-violet-400 px-4 py-2.5 text-base font-semibold text-slate-950 transition hover:bg-violet-300"
            >
              Rematch
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
