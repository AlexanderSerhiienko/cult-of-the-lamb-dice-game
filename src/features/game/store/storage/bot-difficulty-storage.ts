import { BOT_DIFFICULTY } from "@/features/game/core/types";
import type { BotDifficulty } from "@/features/game/core/types";

const BOT_DIFFICULTY_STORAGE_KEY = "knucklebones.botDifficulty";

function isBotDifficulty(value: string): value is BotDifficulty {
  return (
    value === BOT_DIFFICULTY.EASY ||
    value === BOT_DIFFICULTY.MEDIUM ||
    value === BOT_DIFFICULTY.HARD
  );
}

export function readBotDifficulty(): BotDifficulty {
  if (typeof window === "undefined") {
    return BOT_DIFFICULTY.MEDIUM;
  }

  const raw = window.localStorage.getItem(BOT_DIFFICULTY_STORAGE_KEY);
  if (raw && isBotDifficulty(raw)) {
    return raw;
  }

  return BOT_DIFFICULTY.MEDIUM;
}

export function writeBotDifficulty(difficulty: BotDifficulty): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BOT_DIFFICULTY_STORAGE_KEY, difficulty);
}
