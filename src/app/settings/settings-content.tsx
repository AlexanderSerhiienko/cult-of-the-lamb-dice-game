"use client";

import Link from "next/link";
import { useState } from "react";
import { Toast } from "@/components/ui/toast";
import { useGameStore } from "@/features/game/store/use-game-store";
import type { BotDifficulty } from "@/features/game/core/types";

const difficultyOptions: Array<{
  value: BotDifficulty;
  title: string;
  description: string;
}> = [
  {
    value: "easy",
    title: "Easy",
    description: "Mostly random moves. Makes frequent mistakes and is forgiving.",
  },
  {
    value: "medium",
    title: "Medium",
    description: "Greedy one-turn evaluation. Punishes obvious mistakes.",
  },
  {
    value: "hard",
    title: "Hard",
    description: "Greedy + lookahead against your possible responses.",
  },
];

export default function SettingsContent() {
  const botDifficulty = useGameStore((state) => state.botDifficulty);
  const setBotDifficulty = useGameStore((state) => state.setBotDifficulty);
  const [toastTrigger, setToastTrigger] = useState(0);

  const handleDifficultyChange = (difficulty: BotDifficulty) => {
    if (difficulty === botDifficulty) {
      return;
    }

    setBotDifficulty(difficulty);
    setToastTrigger((prev) => prev + 1);
  };

  return (
    <>
      <section className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40 md:p-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">Settings</h1>
          <p className="text-sm text-slate-300/85 md:text-base">
            Choose bot difficulty. The selected level is saved for future sessions.
          </p>
        </div>

        <div className="space-y-3" role="radiogroup" aria-label="Bot difficulty">
          {difficultyOptions.map((option) => {
            const isActive = botDifficulty === option.value;

            return (
              <label
                key={option.value}
                className={`block w-full cursor-pointer rounded-xl border p-4 text-left transition ${
                  isActive
                    ? "border-violet-400/70 bg-violet-400/15 ring-1 ring-violet-300/60"
                    : "border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800"
                } focus-within:outline-none focus-within:ring-2 focus-within:ring-slate-400/40`}
              >
                <input
                  type="radio"
                  name="bot-difficulty"
                  value={option.value}
                  checked={isActive}
                  onChange={() => handleDifficultyChange(option.value)}
                  className="sr-only"
                />
                <p className="text-base font-semibold text-slate-100">{option.title}</p>
                <p className="mt-1 text-sm text-slate-300">{option.description}</p>
              </label>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/"
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Back
          </Link>
        </div>
      </section>
      <Toast eventKey={toastTrigger} message="Saved" />
    </>
  );
}
