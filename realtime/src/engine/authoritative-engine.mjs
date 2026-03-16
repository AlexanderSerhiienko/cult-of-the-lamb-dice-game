function cloneBoard(board) {
  return board.map((column) => [...column]);
}

function getAvailableColumns(board) {
  const available = [];
  for (let i = 0; i < board.length; i += 1) {
    if (board[i].length < 3) {
      available.push(i);
    }
  }
  return available;
}

function applyMoveToBoards({ currentBoard, opponentBoard, columnIndex, dieValue }) {
  if (currentBoard[columnIndex].length >= 3) {
    throw new Error("INVALID_COLUMN");
  }

  const nextCurrent = cloneBoard(currentBoard);
  const nextOpponent = cloneBoard(opponentBoard);
  nextCurrent[columnIndex].push(dieValue);
  nextOpponent[columnIndex] = nextOpponent[columnIndex].filter((value) => value !== dieValue);

  return {
    nextCurrentBoard: nextCurrent,
    nextOpponentBoard: nextOpponent,
  };
}

function scoreColumn(column) {
  const counts = new Map();
  for (const value of column) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  let score = 0;
  for (const [value, count] of counts) {
    score += value * count * count;
  }
  return score;
}

function scoreBoard(board) {
  return board.reduce((total, column) => total + scoreColumn(column), 0);
}

function isBoardFull(board) {
  return board.every((column) => column.length === 3);
}

function getGameStatus(boards) {
  return isBoardFull(boards.player) || isBoardFull(boards.bot) ? "finished" : "in_progress";
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function winnerByScores(scores) {
  if (scores.player > scores.bot) {
    return "player";
  }
  if (scores.player < scores.bot) {
    return "bot";
  }
  return "draw";
}

export function canUserMove(snapshot, userId) {
  return snapshot.phase === "player_turn" && snapshot.turnUserId === userId && snapshot.currentRoll !== null;
}

export function applyAuthoritativeMove({ snapshot, userId, columnIndex }) {
  if (!canUserMove(snapshot, userId)) {
    throw new Error("NOT_YOUR_TURN");
  }

  const isSeat1 = snapshot.players.seat1 === userId;
  const currentBoard = isSeat1 ? snapshot.playerBoard : snapshot.botBoard;
  const opponentBoard = isSeat1 ? snapshot.botBoard : snapshot.playerBoard;
  const availableColumns = getAvailableColumns(currentBoard);
  if (!availableColumns.includes(columnIndex)) {
    throw new Error("INVALID_COLUMN");
  }

  const { nextCurrentBoard, nextOpponentBoard } = applyMoveToBoards({
    currentBoard,
    opponentBoard,
    columnIndex,
    dieValue: snapshot.currentRoll,
  });

  const nextPlayerBoard = isSeat1 ? nextCurrentBoard : nextOpponentBoard;
  const nextBotBoard = isSeat1 ? nextOpponentBoard : nextCurrentBoard;
  const scores = {
    player: scoreBoard(nextPlayerBoard),
    bot: scoreBoard(nextBotBoard),
  };
  const finished = getGameStatus({ player: nextPlayerBoard, bot: nextBotBoard }) === "finished";

  return {
    ...snapshot,
    revision: snapshot.revision + 1,
    phase: finished ? "finished" : "player_turn",
    currentRoll: finished ? null : rollDie(),
    playerBoard: nextPlayerBoard,
    botBoard: nextBotBoard,
    scores,
    winner: finished ? winnerByScores(scores) : null,
    turnUserId: finished ? null : isSeat1 ? snapshot.players.seat2 : snapshot.players.seat1,
  };
}

export function applyDisconnectForfeit({ snapshot, disconnectedUserId }) {
  if (!snapshot || snapshot.winner || snapshot.phase === "finished") {
    return null;
  }

  const isSeat1 = snapshot.players.seat1 === disconnectedUserId;
  const isSeat2 = snapshot.players.seat2 === disconnectedUserId;
  if (!isSeat1 && !isSeat2) {
    return null;
  }

  return {
    ...snapshot,
    revision: snapshot.revision + 1,
    phase: "finished",
    currentRoll: null,
    winner: isSeat1 ? "bot" : "player",
    turnUserId: null,
  };
}

