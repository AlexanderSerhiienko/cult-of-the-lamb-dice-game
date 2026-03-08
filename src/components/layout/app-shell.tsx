"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { useGameStore } from "@/features/game/store/use-game-store";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isGameRoute = pathname === "/game";
  const startGame = useGameStore((state) => state.startGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const status = useGameStore((state) => state.status);
  const phase = useGameStore((state) => state.phase);
  const interactionLocked = useGameStore((state) => state.interactionLocked);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMatchInfoOpen, setIsMatchInfoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <div className="text-lg font-semibold text-slate-100">Knucklebones MVP</div>
          {isGameRoute ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startGame}
                className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-700"
              >
                New game
              </button>
              <button
                type="button"
                onClick={resetGame}
                disabled={status === "idle"}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  status === "idle"
                    ? "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500"
                    : "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                }`}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsRulesOpen(true)}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Rules
              </button>
              <button
                type="button"
                onClick={() => setIsMatchInfoOpen(true)}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Match info
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-4">{children}</main>

      {isRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-slate-600 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Rules</h2>
              <button
                type="button"
                onClick={() => setIsRulesOpen(false)}
                className="rounded-md border border-slate-600 px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>1. Roll is automatic on your turn.</li>
              <li>2. Place die in any available column on your board.</li>
              <li>3. Same value removes opponent dice in the same column.</li>
              <li>4. Duplicates in one column multiply points.</li>
              <li>5. Game ends when one board is fully filled.</li>
            </ul>
          </div>
        </div>
      )}

      {isMatchInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-600 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Match info</h2>
              <button
                type="button"
                onClick={() => setIsMatchInfoOpen(false)}
                className="rounded-md border border-slate-600 px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>
                Status: <span className="font-semibold text-slate-100">{status}</span>
              </p>
              <p>
                Phase: <span className="font-semibold text-slate-100">{phase}</span>
              </p>
              <p>
                Input:{" "}
                <span className="font-semibold text-slate-100">
                  {interactionLocked ? "locked" : "available"}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
