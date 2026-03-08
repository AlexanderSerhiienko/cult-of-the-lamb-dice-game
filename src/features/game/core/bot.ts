import { applyMove, getAvailableColumns, scoreBoard } from "./rules";
import type { Board, BotDifficulty, ColumnIndex, DieValue } from "./types";

export type ChooseBotColumnInput = {
  botBoard: Board;
  playerBoard: Board;
  dieValue: DieValue;
  difficulty?: BotDifficulty;
  random?: () => number;
};

type EvaluatedMove = {
  columnIndex: ColumnIndex;
  immediateScore: number;
  nextBotBoard: Board;
  nextPlayerBoard: Board;
};

const EASY_RANDOM_MOVE_RATE = 0.75;
const HARD_WORST_CASE_WEIGHT = 0.9;
const HARD_AVERAGE_CASE_WEIGHT = 0.1;
const HARD_IMMEDIATE_WEIGHT = 0.25;
const POSSIBLE_PLAYER_ROLLS: DieValue[] = [1, 2, 3, 4, 5, 6];

export function chooseBotColumn({
  botBoard,
  playerBoard,
  dieValue,
  difficulty = "medium",
  random = Math.random,
}: ChooseBotColumnInput): ColumnIndex {
  const availableColumns = getAvailableColumns(botBoard);

  if (availableColumns.length === 0) {
    throw new Error("Bot has no available columns");
  }

  const evaluatedMoves = evaluateMoves({
    botBoard,
    playerBoard,
    dieValue,
    availableColumns,
  });

  if (difficulty === "easy") {
    return chooseEasyColumn(evaluatedMoves, availableColumns, random);
  }

  if (difficulty === "hard") {
    return chooseHardColumn(evaluatedMoves, random);
  }

  return pickBestImmediateColumn(evaluatedMoves, random);
}

function evaluateMoves(params: {
  botBoard: Board;
  playerBoard: Board;
  dieValue: DieValue;
  availableColumns: ColumnIndex[];
}): EvaluatedMove[] {
  const { botBoard, playerBoard, dieValue, availableColumns } = params;

  return availableColumns.map((columnIndex) => {
    const { nextCurrentBoard, nextOpponentBoard } = applyMove({
      currentBoard: botBoard,
      opponentBoard: playerBoard,
      columnIndex,
      dieValue,
    });

    const botScore = scoreBoard(nextCurrentBoard);
    const playerScore = scoreBoard(nextOpponentBoard);
    const removedDiceCount = playerBoard[columnIndex].length - nextOpponentBoard[columnIndex].length;
    const immediateScore = botScore - playerScore + removedDiceCount * 3;

    return {
      columnIndex,
      immediateScore,
      nextBotBoard: nextCurrentBoard,
      nextPlayerBoard: nextOpponentBoard,
    };
  });
}

function chooseEasyColumn(
  evaluatedMoves: EvaluatedMove[],
  availableColumns: ColumnIndex[],
  random: () => number,
): ColumnIndex {
  if (random() < EASY_RANDOM_MOVE_RATE) {
    const randomIndex = Math.floor(random() * availableColumns.length);
    return availableColumns[randomIndex] ?? availableColumns[0];
  }

  return pickBestImmediateColumn(evaluatedMoves, random);
}

function chooseHardColumn(evaluatedMoves: EvaluatedMove[], random: () => number): ColumnIndex {
  let bestScore = Number.NEGATIVE_INFINITY;
  const bestColumns: ColumnIndex[] = [];

  for (const evaluatedMove of evaluatedMoves) {
    const playerResponseScore = evaluatePlayerResponse({
      botBoardAfterMove: evaluatedMove.nextBotBoard,
      playerBoardAfterMove: evaluatedMove.nextPlayerBoard,
    });
    const hardScore = evaluatedMove.immediateScore * HARD_IMMEDIATE_WEIGHT + playerResponseScore;

    if (hardScore > bestScore) {
      bestScore = hardScore;
      bestColumns.length = 0;
      bestColumns.push(evaluatedMove.columnIndex);
      continue;
    }

    if (hardScore === bestScore) {
      bestColumns.push(evaluatedMove.columnIndex);
    }
  }

  const pickIndex = Math.floor(random() * bestColumns.length);
  return bestColumns[pickIndex] ?? bestColumns[0];
}

function evaluatePlayerResponse(params: {
  botBoardAfterMove: Board;
  playerBoardAfterMove: Board;
}): number {
  const { botBoardAfterMove, playerBoardAfterMove } = params;
  const playerColumns = getAvailableColumns(playerBoardAfterMove);

  if (playerColumns.length === 0) {
    return scoreBoard(botBoardAfterMove) - scoreBoard(playerBoardAfterMove);
  }

  const rollOutcomes = POSSIBLE_PLAYER_ROLLS.map((roll) => {
    let bestPlayerOutcome = Number.POSITIVE_INFINITY;

    for (const columnIndex of playerColumns) {
      const { nextCurrentBoard, nextOpponentBoard } = applyMove({
        currentBoard: playerBoardAfterMove,
        opponentBoard: botBoardAfterMove,
        columnIndex,
        dieValue: roll,
      });
      const botAdvantageAfterResponse = scoreBoard(nextOpponentBoard) - scoreBoard(nextCurrentBoard);
      bestPlayerOutcome = Math.min(bestPlayerOutcome, botAdvantageAfterResponse);
    }

    return bestPlayerOutcome;
  });

  const worstCase = Math.min(...rollOutcomes);
  const averageCase = rollOutcomes.reduce((total, score) => total + score, 0) / rollOutcomes.length;

  return worstCase * HARD_WORST_CASE_WEIGHT + averageCase * HARD_AVERAGE_CASE_WEIGHT;
}

function pickBestImmediateColumn(evaluatedMoves: EvaluatedMove[], random: () => number): ColumnIndex {
  const bestColumns: ColumnIndex[] = [];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const evaluatedMove of evaluatedMoves) {
    if (evaluatedMove.immediateScore > bestScore) {
      bestScore = evaluatedMove.immediateScore;
      bestColumns.length = 0;
      bestColumns.push(evaluatedMove.columnIndex);
      continue;
    }

    if (evaluatedMove.immediateScore === bestScore) {
      bestColumns.push(evaluatedMove.columnIndex);
    }
  }

  const pickIndex = Math.floor(random() * bestColumns.length);
  return bestColumns[pickIndex] ?? bestColumns[0];
}
