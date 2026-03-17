import { rollDie } from "@/features/game/core/rules";
import type { DieValue } from "@/features/game/core/types";

export type GameDiceSource = {
  getNextRoll: () => DieValue;
};

export type GameStoreDependencies = {
  diceSource: GameDiceSource;
  createMatchId: () => string;
};

export function createRandomDiceSource(random: () => number = Math.random): GameDiceSource {
  return {
    getNextRoll: () => rollDie(random),
  };
}

export function createScriptedDiceSource(sequence: DieValue[]): GameDiceSource {
  const remaining = [...sequence];

  return {
    getNextRoll: () => {
      const nextRoll = remaining.shift();
      if (typeof nextRoll !== "number") {
        throw new Error("Scripted dice source exhausted");
      }

      return nextRoll;
    },
  };
}

export function createDefaultMatchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createDefaultGameStoreDependencies(): GameStoreDependencies {
  return {
    diceSource: createRandomDiceSource(),
    createMatchId: createDefaultMatchId,
  };
}
