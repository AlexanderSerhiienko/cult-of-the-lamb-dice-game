import { describe, expect, it } from "vitest";
import { chooseBotColumn } from "./bot";
import { BOT_DIFFICULTY } from "./types";
import type { Board } from "./types";

function createRandomSequence(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

describe("chooseBotColumn", () => {
  it("returns one of available columns", () => {
    const botBoard: Board = [[1, 2, 3], [], []];
    const playerBoard: Board = [[], [], []];

    const result = chooseBotColumn({
      botBoard,
      playerBoard,
      dieValue: 4,
      random: () => 0.4,
    });

    expect([1, 2]).toContain(result);
  });

  it("prefers move that removes player dice in same column", () => {
    const botBoard: Board = [[], [], []];
    const playerBoard: Board = [[4, 4], [1, 2], []];

    const result = chooseBotColumn({
      botBoard,
      playerBoard,
      dieValue: 4,
      difficulty: BOT_DIFFICULTY.MEDIUM,
      random: () => 0,
    });

    expect(result).toBe(0);
  });

  it("easy mode can pick non-optimal random move", () => {
    const botBoard: Board = [[], [], []];
    const playerBoard: Board = [[4, 4], [], []];
    const random = createRandomSequence([0.1, 0.95]);

    const result = chooseBotColumn({
      botBoard,
      playerBoard,
      dieValue: 4,
      difficulty: BOT_DIFFICULTY.EASY,
      random,
    });

    expect(result).toBe(2);
  });

  it("hard mode evaluates lookahead and always returns available column", () => {
    const botBoard: Board = [
      [6, 6],
      [2, 2],
      [],
    ];
    const playerBoard: Board = [[], [1, 1], []];

    const mediumResult = chooseBotColumn({
      botBoard,
      playerBoard,
      dieValue: 6,
      difficulty: BOT_DIFFICULTY.MEDIUM,
      random: () => 0,
    });
    const hardResult = chooseBotColumn({
      botBoard,
      playerBoard,
      dieValue: 6,
      difficulty: BOT_DIFFICULTY.HARD,
      random: () => 0,
    });

    expect(mediumResult).toBe(0);
    expect([0, 1, 2]).toContain(hardResult);
  });

  it("throws when bot has no available columns", () => {
    const fullBotBoard: Board = [
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
    ];
    const playerBoard: Board = [[], [], []];

    expect(() =>
      chooseBotColumn({
        botBoard: fullBotBoard,
        playerBoard,
        dieValue: 2,
      }),
    ).toThrowError("Bot has no available columns");
  });
});
