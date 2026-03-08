import { describe, expect, it } from "vitest";
import { GAME_RESULT, GAME_STATUS } from "./types";
import {
  applyMove,
  createEmptyBoard,
  createInitialBoards,
  determineResult,
  getAvailableColumns,
  getGameStatus,
  isGameOver,
  isBoardFull,
  placeDie,
  removeMatchingDice,
  rollDie,
  scoreBoard,
  scoreColumn,
} from "./rules";
import type { Board } from "./types";

describe("rollDie", () => {
  it("returns value in 1..6", () => {
    for (let index = 0; index < 200; index += 1) {
      const value = rollDie();
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it("maps random boundaries correctly", () => {
    expect(rollDie(() => 0)).toBe(1);
    expect(rollDie(() => 0.999999)).toBe(6);
  });

  it("throws for invalid random source output", () => {
    expect(() => rollDie(() => 1)).toThrowError("Invalid die value");
  });
});

describe("getAvailableColumns", () => {
  it("returns all column indices with free slots", () => {
    const board: Board = [[1, 2], [3, 3, 3], []];
    expect(getAvailableColumns(board)).toEqual([0, 2]);
  });

  it("returns empty list for full board", () => {
    const board: Board = [
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
    ];
    expect(getAvailableColumns(board)).toEqual([]);
  });

  it("throws for malformed board with invalid column index", () => {
    const malformedBoard = [[], [], [], []] as unknown as Board;
    expect(() => getAvailableColumns(malformedBoard)).toThrowError("Invalid column index");
  });
});

describe("placeDie", () => {
  it("places die into selected column", () => {
    const board: Board = [[1], [], []];
    const nextBoard = placeDie(board, 0, 4);
    expect(nextBoard[0]).toEqual([1, 4]);
    expect(nextBoard[1]).toEqual([]);
    expect(nextBoard[2]).toEqual([]);
  });

  it("throws when placing into full column", () => {
    const board: Board = [[1, 2, 3], [], []];
    expect(() => placeDie(board, 0, 6)).toThrowError("Column is full");
  });
});

describe("removeMatchingDice", () => {
  it("removes all matching dice in corresponding column", () => {
    const board: Board = [[], [], [4, 2, 4]];
    const nextBoard = removeMatchingDice(board, 2, 4);
    expect(nextBoard[2]).toEqual([2]);
  });

  it("removes only in corresponding column", () => {
    const board: Board = [
      [4, 1],
      [2, 2],
      [4, 3],
    ];
    const nextBoard = removeMatchingDice(board, 0, 4);
    expect(nextBoard[0]).toEqual([1]);
    expect(nextBoard[1]).toEqual([2, 2]);
    expect(nextBoard[2]).toEqual([4, 3]);
  });
});

describe("scoreColumn", () => {
  it("scores [4,1,4] as 17", () => {
    expect(scoreColumn([4, 1, 4])).toBe(17);
  });

  it("scores [6,6] as 24", () => {
    expect(scoreColumn([6, 6])).toBe(24);
  });

  it("scores [3,3,3] as 27", () => {
    expect(scoreColumn([3, 3, 3])).toBe(27);
  });
});

describe("scoreBoard", () => {
  it("sums all three columns", () => {
    const board: Board = [
      [4, 1, 4],
      [6, 6],
      [3, 3, 3],
    ];
    expect(scoreBoard(board)).toBe(68);
  });
});

describe("applyMove and score after removal", () => {
  it("removes two equal dice at once and recalculates score correctly", () => {
    const currentBoard: Board = createEmptyBoard();
    const opponentBoard: Board = [[], [], [4, 2, 4]];

    const { nextCurrentBoard, nextOpponentBoard } = applyMove({
      currentBoard,
      opponentBoard,
      columnIndex: 2,
      dieValue: 4,
    });

    expect(nextCurrentBoard[2]).toEqual([4]);
    expect(nextOpponentBoard[2]).toEqual([2]);
    expect(scoreBoard(nextOpponentBoard)).toBe(2);
  });
});

describe("game end and result", () => {
  it("creates empty boards for both players", () => {
    expect(createInitialBoards()).toEqual({
      player: [[], [], []],
      bot: [[], [], []],
    });
  });

  it("detects board full", () => {
    const board: Board = [
      [1, 2, 3],
      [4, 5, 6],
      [1, 1, 1],
    ];
    expect(isBoardFull(board)).toBe(true);
  });

  it("ends game when one board is full", () => {
    const boards = {
      player: [
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
      ] as Board,
      bot: createEmptyBoard(),
    };

    expect(isGameOver(boards)).toBe(true);
  });

  it("returns in_progress status while game is active", () => {
    expect(
      getGameStatus({
        player: createEmptyBoard(),
        bot: createEmptyBoard(),
      }),
    ).toBe(GAME_STATUS.IN_PROGRESS);
  });

  it("returns finished status when game is over", () => {
    expect(
      getGameStatus({
        player: [
          [1, 2, 3],
          [1, 2, 3],
          [1, 2, 3],
        ],
        bot: createEmptyBoard(),
      }),
    ).toBe(GAME_STATUS.FINISHED);
  });

  it("returns win when player score is higher", () => {
    const playerBoard: Board = [[6, 6], [3, 3], []];
    const botBoard: Board = [[1], [2], [3]];
    expect(determineResult(playerBoard, botBoard)).toBe(GAME_RESULT.WIN);
  });

  it("returns lose when bot score is higher", () => {
    const playerBoard: Board = [[1], [], []];
    const botBoard: Board = [[6], [6], [6]];
    expect(determineResult(playerBoard, botBoard)).toBe(GAME_RESULT.LOSE);
  });

  it("returns draw when scores are equal", () => {
    const playerBoard: Board = [[2], [3], []];
    const botBoard: Board = [[1], [4], []];
    expect(determineResult(playerBoard, botBoard)).toBe(GAME_RESULT.DRAW);
  });
});
