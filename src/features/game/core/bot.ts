import { applyMove, getAvailableColumns, scoreBoard } from "./rules";
import { BOT_DIFFICULTY } from "./types";
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
const HARD_WORST_CASE_WEIGHT = 0.55;
const HARD_AVERAGE_CASE_WEIGHT = 0.25;
const HARD_IMMEDIATE_WEIGHT = 0.2;
const BOARD_SPACE_WEIGHT = 0.5;
const POSSIBLE_PLAYER_ROLLS: DieValue[] = [1, 2, 3, 4, 5, 6];
const POSSIBLE_BOT_ROLLS: DieValue[] = [1, 2, 3, 4, 5, 6];

export function chooseBotColumn({
  botBoard,
  playerBoard,
  dieValue,
  difficulty = BOT_DIFFICULTY.MEDIUM,
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

  if (difficulty === BOT_DIFFICULTY.EASY) {
    return chooseEasyColumn(evaluatedMoves, availableColumns, random);
  }

  if (difficulty === BOT_DIFFICULTY.HARD) {
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
    const lookaheadScore = evaluateHardLookahead({
      botBoardAfterMove: evaluatedMove.nextBotBoard,
      playerBoardAfterMove: evaluatedMove.nextPlayerBoard,
    });
    const hardScore = evaluatedMove.immediateScore * HARD_IMMEDIATE_WEIGHT + lookaheadScore;

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

function evaluateHardLookahead(params: {
  botBoardAfterMove: Board;
  playerBoardAfterMove: Board;
}): number {
  const { botBoardAfterMove, playerBoardAfterMove } = params;

  const rollOutcomes = POSSIBLE_PLAYER_ROLLS.map((roll) => {
    return evaluatePlayerTurn({
      botBoard: botBoardAfterMove,
      playerBoard: playerBoardAfterMove,
      playerRoll: roll,
    });
  });

  const worstCase = Math.min(...rollOutcomes);
  const averageCase = rollOutcomes.reduce((total, score) => total + score, 0) / rollOutcomes.length;

  return worstCase * HARD_WORST_CASE_WEIGHT + averageCase * HARD_AVERAGE_CASE_WEIGHT;
}

function evaluatePlayerTurn(params: {
  botBoard: Board;
  playerBoard: Board;
  playerRoll: DieValue;
}): number {
  const { botBoard, playerBoard, playerRoll } = params;
  const playerColumns = getAvailableColumns(playerBoard);

  if (playerColumns.length === 0) {
    return evaluateExpectedBotReply({ botBoard, playerBoard });
  }

  let worstBotOutcome = Number.POSITIVE_INFINITY;

  for (const columnIndex of playerColumns) {
    const { nextCurrentBoard, nextOpponentBoard } = applyMove({
      currentBoard: playerBoard,
      opponentBoard: botBoard,
      columnIndex,
      dieValue: playerRoll,
    });

    const botOutcome = evaluateExpectedBotReply({
      botBoard: nextOpponentBoard,
      playerBoard: nextCurrentBoard,
    });

    worstBotOutcome = Math.min(worstBotOutcome, botOutcome);
  }

  return worstBotOutcome;
}

function evaluateExpectedBotReply(params: {
  botBoard: Board;
  playerBoard: Board;
}): number {
  const { botBoard, playerBoard } = params;
  const botColumns = getAvailableColumns(botBoard);

  if (botColumns.length === 0) {
    return evaluateBoardAdvantage({ botBoard, playerBoard });
  }

  const outcomes = POSSIBLE_BOT_ROLLS.map((botRoll) => {
    let bestOutcomeForRoll = Number.NEGATIVE_INFINITY;

    for (const columnIndex of botColumns) {
      const { nextCurrentBoard, nextOpponentBoard } = applyMove({
        currentBoard: botBoard,
        opponentBoard: playerBoard,
        columnIndex,
        dieValue: botRoll,
      });

      bestOutcomeForRoll = Math.max(
        bestOutcomeForRoll,
        evaluateBoardAdvantage({
          botBoard: nextCurrentBoard,
          playerBoard: nextOpponentBoard,
        }),
      );
    }

    return bestOutcomeForRoll;
  });

  return outcomes.reduce((total, score) => total + score, 0) / outcomes.length;
}

function evaluateBoardAdvantage(params: {
  botBoard: Board;
  playerBoard: Board;
}): number {
  const { botBoard, playerBoard } = params;
  const botSpace = getAvailableColumns(botBoard).length;
  const playerSpace = getAvailableColumns(playerBoard).length;

  return scoreBoard(botBoard) - scoreBoard(playerBoard) + (botSpace - playerSpace) * BOARD_SPACE_WEIGHT;
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
