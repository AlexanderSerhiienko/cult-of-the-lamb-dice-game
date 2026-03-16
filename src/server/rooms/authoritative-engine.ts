import { applyMove, createInitialBoards, getAvailableColumns, getGameStatus, rollDie, scoreBoard } from "@/features/game/core/rules";
import { GAME_PHASE, GAME_RESULT, GAME_STATUS, PLAYER } from "@/features/game/core/types";
import type { Board, ColumnIndex, DieValue } from "@/features/game/core/types";

export type OnlineAuthoritativeSnapshot = {
  roomId: string;
  matchId: string;
  revision: number;
  phase: (typeof GAME_PHASE)[keyof typeof GAME_PHASE];
  currentRoll: DieValue | null;
  playerBoard: Board;
  botBoard: Board;
  scores: { player: number; bot: number };
  winner: "player" | "bot" | "draw" | null;
  turnUserId: string | null;
  players: {
    seat1: string;
    seat2: string;
  };
  connectionStates?: Record<
    string,
    {
      status: "connected" | "disconnected";
      disconnectedAt: number | null;
      reconnectDeadlineMs: number | null;
    }
  >;
};

export function createInitialOnlineSnapshot(params: {
  roomId: string;
  matchId: string;
  seat1UserId: string;
  seat2UserId: string;
}): OnlineAuthoritativeSnapshot {
  const boards = createInitialBoards();
  return {
    roomId: params.roomId,
    matchId: params.matchId,
    revision: 1,
    phase: GAME_PHASE.PLAYER_TURN,
    currentRoll: rollDie(),
    playerBoard: boards.player,
    botBoard: boards.bot,
    scores: { player: 0, bot: 0 },
    winner: null,
    turnUserId: params.seat1UserId,
    players: {
      seat1: params.seat1UserId,
      seat2: params.seat2UserId,
    },
    connectionStates: {},
  };
}

export function canUserMove(snapshot: OnlineAuthoritativeSnapshot, userId: string): boolean {
  return snapshot.turnUserId === userId && snapshot.phase === GAME_PHASE.PLAYER_TURN;
}

export function applyOnlineMove(params: {
  snapshot: OnlineAuthoritativeSnapshot;
  userId: string;
  columnIndex: ColumnIndex;
}): OnlineAuthoritativeSnapshot {
  const { snapshot, userId, columnIndex } = params;

  if (!canUserMove(snapshot, userId)) {
    throw new Error("Not your turn");
  }
  if (snapshot.currentRoll === null) {
    throw new Error("Missing current roll");
  }

  const isSeat1 = snapshot.players.seat1 === userId;
  const currentBoard = isSeat1 ? snapshot.playerBoard : snapshot.botBoard;
  const opponentBoard = isSeat1 ? snapshot.botBoard : snapshot.playerBoard;
  const availableColumns = getAvailableColumns(currentBoard);
  if (!availableColumns.includes(columnIndex)) {
    throw new Error("Column is not available");
  }

  const { nextCurrentBoard, nextOpponentBoard } = applyMove({
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

  const status = getGameStatus({
    player: nextPlayerBoard,
    bot: nextBotBoard,
  });
  const finished = status === GAME_STATUS.FINISHED;

  const winner =
    finished && scores.player > scores.bot
      ? PLAYER.PLAYER
      : finished && scores.player < scores.bot
        ? PLAYER.BOT
        : finished
          ? GAME_RESULT.DRAW
          : null;

  return {
    ...snapshot,
    revision: snapshot.revision + 1,
    phase: finished ? GAME_PHASE.FINISHED : GAME_PHASE.PLAYER_TURN,
    currentRoll: finished ? null : rollDie(),
    playerBoard: nextPlayerBoard,
    botBoard: nextBotBoard,
    scores,
    winner,
    turnUserId: finished ? null : isSeat1 ? snapshot.players.seat2 : snapshot.players.seat1,
  };
}
