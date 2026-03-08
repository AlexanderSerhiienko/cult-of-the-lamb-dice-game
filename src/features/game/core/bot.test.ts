import { describe, expect, it } from "vitest";
import { chooseBotColumn } from "./bot";
import type { Board } from "./types";

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
      random: () => 0,
    });

    expect(result).toBe(0);
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
