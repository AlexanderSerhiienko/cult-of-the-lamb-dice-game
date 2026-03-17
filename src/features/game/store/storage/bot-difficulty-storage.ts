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

function getStorage(): Storage | null {
  if (
    typeof window === "undefined" ||
    typeof window.localStorage === "undefined" ||
    typeof window.localStorage.getItem !== "function" ||
    typeof window.localStorage.setItem !== "function"
  ) {
    return null;
  }

  return window.localStorage;
}

export function readBotDifficulty(): BotDifficulty {
  const storage = getStorage();
  if (!storage) {
    return BOT_DIFFICULTY.MEDIUM;
  }

  const raw = storage.getItem(BOT_DIFFICULTY_STORAGE_KEY);
  if (raw && isBotDifficulty(raw)) {
    return raw;
  }

  return BOT_DIFFICULTY.MEDIUM;
}

export function writeBotDifficulty(difficulty: BotDifficulty): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(BOT_DIFFICULTY_STORAGE_KEY, difficulty);
}
