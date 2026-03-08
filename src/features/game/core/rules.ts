import type {
  Board,
  BoardsByPlayer,
  Column,
  ColumnIndex,
  DieValue,
  GameResult,
  GameStatus,
} from "./types";
import { GAME_RESULT, GAME_STATUS } from "./types";

export const BOARD_COLUMNS_COUNT = 3;
export const COLUMN_CAPACITY = 3;
export const DIE_MIN = 1;
export const DIE_MAX = 6;

export type ApplyMoveInput = {
  currentBoard: Board;
  opponentBoard: Board;
  columnIndex: ColumnIndex;
  dieValue: DieValue;
};

export type ApplyMoveResult = {
  nextCurrentBoard: Board;
  nextOpponentBoard: Board;
};

export function createEmptyBoard(): Board {
  return [[], [], []];
}

export function createInitialBoards(): BoardsByPlayer {
  return {
    player: createEmptyBoard(),
    bot: createEmptyBoard(),
  };
}

export function rollDie(random: () => number = Math.random): DieValue {
  const value = Math.floor(random() * DIE_MAX) + DIE_MIN;
  return asDieValue(value);
}

export function getAvailableColumns(board: Board): ColumnIndex[] {
  return board
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.length < COLUMN_CAPACITY)
    .map(({ index }) => asColumnIndex(index));
}

export function placeDie(board: Board, columnIndex: ColumnIndex, dieValue: DieValue): Board {
  const targetColumn = board[columnIndex];

  if (targetColumn.length >= COLUMN_CAPACITY) {
    throw new Error("Column is full");
  }

  const nextBoard = cloneBoard(board);
  nextBoard[columnIndex].push(dieValue);
  return nextBoard;
}

export function removeMatchingDice(
  board: Board,
  columnIndex: ColumnIndex,
  dieValue: DieValue,
): Board {
  const nextBoard = cloneBoard(board);
  nextBoard[columnIndex] = nextBoard[columnIndex].filter((value) => value !== dieValue);
  return nextBoard;
}

export function applyMove({
  currentBoard,
  opponentBoard,
  columnIndex,
  dieValue,
}: ApplyMoveInput): ApplyMoveResult {
  const nextCurrentBoard = placeDie(currentBoard, columnIndex, dieValue);
  const nextOpponentBoard = removeMatchingDice(opponentBoard, columnIndex, dieValue);

  return {
    nextCurrentBoard,
    nextOpponentBoard,
  };
}

export function scoreColumn(column: Column): number {
  const counts = new Map<DieValue, number>();

  for (const value of column) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let score = 0;

  for (const [value, count] of counts) {
    score += value * count * count;
  }

  return score;
}

export function scoreBoard(board: Board): number {
  return board.reduce((total, column) => total + scoreColumn(column), 0);
}

export function isBoardFull(board: Board): boolean {
  return board.every((column) => column.length === COLUMN_CAPACITY);
}

export function isGameOver(boards: BoardsByPlayer): boolean {
  return isBoardFull(boards.player) || isBoardFull(boards.bot);
}

export function getGameStatus(boards: BoardsByPlayer): GameStatus {
  return isGameOver(boards) ? GAME_STATUS.FINISHED : GAME_STATUS.IN_PROGRESS;
}

export function determineResult(playerBoard: Board, botBoard: Board): GameResult {
  const playerScore = scoreBoard(playerBoard);
  const botScore = scoreBoard(botBoard);

  if (playerScore > botScore) {
    return GAME_RESULT.WIN;
  }

  if (playerScore < botScore) {
    return GAME_RESULT.LOSE;
  }

  return GAME_RESULT.DRAW;
}

function cloneBoard(board: Board): Board {
  return board.map((column) => [...column]) as Board;
}

function asColumnIndex(index: number): ColumnIndex {
  if (index === 0 || index === 1 || index === 2) {
    return index;
  }

  throw new Error("Invalid column index");
}

function asDieValue(value: number): DieValue {
  if (value >= DIE_MIN && value <= DIE_MAX) {
    return value as DieValue;
  }

  throw new Error("Invalid die value");
}
