function cloneBoard(board) {
  return board.map((column) => [...column]);
}

function createInitialBoards() {
  return {
    player: [[], [], []],
    bot: [[], [], []],
  };
}

function getAvailableColumns(board) {
  const available = [];
  for (let index = 0; index < board.length; index += 1) {
    if (board[index].length < 3) {
      available.push(index);
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
  return isBoardFull(boards.seat1) || isBoardFull(boards.seat2) ? "finished" : "in_progress";
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function resolveWinner(scores) {
  if (scores.seat1 > scores.seat2) {
    return "seat1";
  }
  if (scores.seat1 < scores.seat2) {
    return "seat2";
  }
  return "draw";
}

export function createInitialOnlineSnapshot(params) {
  const boards = createInitialBoards();

  return {
    roomId: params.roomId,
    matchId: params.matchId,
    revision: 1,
    phase: "player_turn",
    currentRoll: rollDie(),
    seat1Board: boards.player,
    seat2Board: boards.bot,
    seatScores: { seat1: 0, seat2: 0 },
    winner: null,
    turnUserId: params.seat1UserId,
    players: {
      seat1: params.seat1UserId,
      seat2: params.seat2UserId,
    },
    connectionStates: {},
  };
}

export function canUserMove(snapshot, userId) {
  return snapshot.phase === "player_turn" && snapshot.turnUserId === userId && snapshot.currentRoll !== null;
}

export function applyOnlineMove(params) {
  const { snapshot, userId, columnIndex } = params;

  if (!canUserMove(snapshot, userId)) {
    throw new Error("Not your turn");
  }

  const isSeat1 = snapshot.players.seat1 === userId;
  const currentBoard = isSeat1 ? snapshot.seat1Board : snapshot.seat2Board;
  const opponentBoard = isSeat1 ? snapshot.seat2Board : snapshot.seat1Board;
  const availableColumns = getAvailableColumns(currentBoard);
  if (!availableColumns.includes(columnIndex)) {
    throw new Error("Column is not available");
  }

  const { nextCurrentBoard, nextOpponentBoard } = applyMoveToBoards({
    currentBoard,
    opponentBoard,
    columnIndex,
    dieValue: snapshot.currentRoll,
  });

  const nextSeat1Board = isSeat1 ? nextCurrentBoard : nextOpponentBoard;
  const nextSeat2Board = isSeat1 ? nextOpponentBoard : nextCurrentBoard;
  const seatScores = {
    seat1: scoreBoard(nextSeat1Board),
    seat2: scoreBoard(nextSeat2Board),
  };
  const finished = getGameStatus({ seat1: nextSeat1Board, seat2: nextSeat2Board }) === "finished";

  return {
    ...snapshot,
    revision: snapshot.revision + 1,
    phase: finished ? "finished" : "player_turn",
    currentRoll: finished ? null : rollDie(),
    seat1Board: nextSeat1Board,
    seat2Board: nextSeat2Board,
    seatScores,
    winner: finished ? resolveWinner(seatScores) : null,
    turnUserId: finished ? null : isSeat1 ? snapshot.players.seat2 : snapshot.players.seat1,
  };
}

export function applyDisconnectForfeit(params) {
  const { snapshot, disconnectedUserId } = params;

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
    winner: isSeat1 ? "seat2" : "seat1",
    turnUserId: null,
  };
}
