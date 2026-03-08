import { applyMove, getAvailableColumns, scoreBoard } from "./rules";
import type { Board, ColumnIndex, DieValue } from "./types";

export type ChooseBotColumnInput = {
  botBoard: Board;
  playerBoard: Board;
  dieValue: DieValue;
  random?: () => number;
};

export function chooseBotColumn({
  botBoard,
  playerBoard,
  dieValue,
  random = Math.random,
}: ChooseBotColumnInput): ColumnIndex {
  const availableColumns = getAvailableColumns(botBoard);

  if (availableColumns.length === 0) {
    throw new Error("Bot has no available columns");
  }

  const bestColumns: ColumnIndex[] = [];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const columnIndex of availableColumns) {
    const { nextCurrentBoard, nextOpponentBoard } = applyMove({
      currentBoard: botBoard,
      opponentBoard: playerBoard,
      columnIndex,
      dieValue,
    });

    const botScore = scoreBoard(nextCurrentBoard);
    const playerScore = scoreBoard(nextOpponentBoard);
    const removedDiceCount =
      playerBoard[columnIndex].length - nextOpponentBoard[columnIndex].length;
    const heuristicScore = botScore - playerScore + removedDiceCount * 3;

    if (heuristicScore > bestScore) {
      bestScore = heuristicScore;
      bestColumns.length = 0;
      bestColumns.push(columnIndex);
      continue;
    }

    if (heuristicScore === bestScore) {
      bestColumns.push(columnIndex);
    }
  }

  const pickIndex = Math.floor(random() * bestColumns.length);
  return bestColumns[pickIndex] ?? bestColumns[0];
}
