import type { StoreApi } from "zustand";
import { chooseBotColumn } from "@/features/game/core/bot";
import {
  applyMove,
  createInitialBoards,
  determineResult,
  getAvailableColumns,
  getGameStatus,
  scoreBoard,
} from "@/features/game/core/rules";
import { GAME_MODE, GAME_PHASE, GAME_RESULT, GAME_STATUS, PLAYER } from "@/features/game/core/types";
import type { ColumnIndex, DieValue, GameWinner } from "@/features/game/core/types";
import { GAME_SFX_EVENT, playGameSfx } from "@/features/game/sound/game-sfx";
import type { GameStoreDependencies } from "@/features/game/store/game-store-deps";
import { createInitialGameStoreState } from "@/features/game/store/state/create-initial-game-store-state";
import { writeBotDifficulty } from "@/features/game/store/storage/bot-difficulty-storage";
import { writeSoundEnabled } from "@/features/game/store/storage/sound-storage";
import type { GameStore, GameStoreActions } from "@/features/game/store/types/game-store";

type SetState = StoreApi<GameStore>["setState"];
type GetState = StoreApi<GameStore>["getState"];

type SeatBoards = Pick<GameStore, "seat1Board" | "seat2Board">;
type TurnState = Pick<GameStore, "currentRoll" | "turn" | "phase" | "interactionLocked" | "status">;

function createSeatBoardState(params: {
  seat1Board: GameStore["seat1Board"];
  seat2Board: GameStore["seat2Board"];
}) {
  return {
    seat1Board: params.seat1Board,
    seat2Board: params.seat2Board,
  };
}

function createSeatScoreState(seatScores: GameStore["seatScores"]) {
  return {
    seatScores,
  };
}

function buildSeatScoresFromBoards(params: SeatBoards): GameStore["seatScores"] {
  return {
    seat1: scoreBoard(params.seat1Board),
    seat2: scoreBoard(params.seat2Board),
  };
}

function createStartedMatchState(params: {
  deps: GameStoreDependencies;
  seat1Board: GameStore["seat1Board"];
  seat2Board: GameStore["seat2Board"];
}) {
  return {
    ...createSeatBoardState({
      seat1Board: params.seat1Board,
      seat2Board: params.seat2Board,
    }),
    currentRoll: params.deps.diceSource.getNextRoll(),
    turn: PLAYER.PLAYER,
    phase: GAME_PHASE.PLAYER_TURN,
    interactionLocked: false,
    ...createSeatScoreState({ seat1: 0, seat2: 0 }),
    status: GAME_STATUS.IN_PROGRESS,
    winner: null,
    matchId: params.deps.createMatchId(),
    reportStatus: "idle" as const,
    reportedAt: null,
    reportError: null,
  };
}

function buildSeatBoardsAfterHumanMove(params: {
  isSeat1Turn: boolean;
  activeBoard: GameStore["seat1Board"];
  passiveBoard: GameStore["seat1Board"];
  columnIndex: ColumnIndex;
  dieValue: DieValue;
}): SeatBoards {
  const { nextCurrentBoard, nextOpponentBoard } = applyMove({
    currentBoard: params.activeBoard,
    opponentBoard: params.passiveBoard,
    columnIndex: params.columnIndex,
    dieValue: params.dieValue,
  });

  if (params.isSeat1Turn) {
    return {
      seat1Board: nextCurrentBoard,
      seat2Board: nextOpponentBoard,
    };
  }

  return {
    seat1Board: nextOpponentBoard,
    seat2Board: nextCurrentBoard,
  };
}

function getRemovedDiceCount(params: {
  isSeat1Turn: boolean;
  previousBoards: SeatBoards;
  nextBoards: SeatBoards;
  columnIndex: ColumnIndex;
}) {
  const { isSeat1Turn, previousBoards, nextBoards, columnIndex } = params;

  if (isSeat1Turn) {
    return previousBoards.seat2Board[columnIndex].length - nextBoards.seat2Board[columnIndex].length;
  }

  return previousBoards.seat1Board[columnIndex].length - nextBoards.seat1Board[columnIndex].length;
}

function resolveNextTurnState(params: {
  finished: boolean;
  isPvb: boolean;
  isSeat1Turn: boolean;
  currentTurn: GameStore["turn"];
  deps: GameStoreDependencies;
}): TurnState {
  const { finished, isPvb, isSeat1Turn, currentTurn, deps } = params;

  if (finished) {
    return {
      currentRoll: null,
      turn: currentTurn,
      phase: GAME_PHASE.FINISHED,
      interactionLocked: true,
      status: GAME_STATUS.FINISHED,
    };
  }

  return {
    currentRoll: isPvb ? null : deps.diceSource.getNextRoll(),
    turn: isSeat1Turn ? PLAYER.BOT : PLAYER.PLAYER,
    phase: isSeat1Turn ? GAME_PHASE.BOT_TURN : GAME_PHASE.PLAYER_TURN,
    interactionLocked: false,
    status: GAME_STATUS.IN_PROGRESS,
  };
}

function resolveFinishedWinner(result: ReturnType<typeof determineResult>): GameWinner {
  if (result === GAME_RESULT.DRAW) {
    return GAME_RESULT.DRAW;
  }

  return result === GAME_RESULT.WIN ? PLAYER.PLAYER : PLAYER.BOT;
}

function resolveFinishSfxEvent(winner: GameWinner) {
  if (winner === PLAYER.PLAYER) {
    return GAME_SFX_EVENT.VICTORY;
  }

  if (winner === PLAYER.BOT) {
    return GAME_SFX_EVENT.DEFEAT;
  }

  return GAME_SFX_EVENT.DRAW;
}

function resolveReportStatusForOnlineSync(params: {
  phase: GameStore["phase"];
  gameMode: GameStore["gameMode"];
  currentReportStatus: GameStore["reportStatus"];
}) {
  const { phase, gameMode, currentReportStatus } = params;

  if (phase === GAME_PHASE.FINISHED && gameMode === GAME_MODE.ONLINE_PRIVATE) {
    return "pending" as const;
  }

  return currentReportStatus;
}

export function createGameStoreActions(params: {
  set: SetState;
  get: GetState;
  deps: GameStoreDependencies;
}): GameStoreActions {
  const { set, get, deps } = params;

  return {
    startGame: () => {
      const boards = createInitialBoards();
      set(
        createStartedMatchState({
          deps,
          seat1Board: boards.player,
          seat2Board: boards.bot,
        }),
      );
    },
    setGameMode: (mode) => {
      set({ gameMode: mode });
    },
    setBotDifficulty: (difficulty) => {
      writeBotDifficulty(difficulty);
      set({ botDifficulty: difficulty });
    },
    setSoundEnabled: (enabled) => {
      writeSoundEnabled(enabled);
      set({ soundEnabled: enabled });
    },
    placePlayerDie: (columnIndex) => {
      const state = get();
      if (state.gameMode === GAME_MODE.ONLINE_PRIVATE) {
        return;
      }

      const isPlayerTurn = state.phase === GAME_PHASE.PLAYER_TURN;
      const isLocalOpponentTurn =
        state.gameMode === GAME_MODE.LOCAL_PVP && state.phase === GAME_PHASE.BOT_TURN;
      const isHumanTurn = isPlayerTurn || isLocalOpponentTurn;

      if (state.interactionLocked || !isHumanTurn || state.currentRoll === null) {
        return;
      }

      const activeBoard = isPlayerTurn ? state.seat1Board : state.seat2Board;
      const passiveBoard = isPlayerTurn ? state.seat2Board : state.seat1Board;
      const availableColumns = getAvailableColumns(activeBoard);
      if (!availableColumns.includes(columnIndex)) {
        return;
      }

      set({ interactionLocked: true });

      const nextBoards = buildSeatBoardsAfterHumanMove({
        isSeat1Turn: isPlayerTurn,
        activeBoard,
        passiveBoard,
        columnIndex,
        dieValue: state.currentRoll,
      });
      const seatScores = buildSeatScoresFromBoards(nextBoards);
      const removedDiceCount = getRemovedDiceCount({
        isSeat1Turn: isPlayerTurn,
        previousBoards: {
          seat1Board: state.seat1Board,
          seat2Board: state.seat2Board,
        },
        nextBoards,
        columnIndex,
      });

      playGameSfx(GAME_SFX_EVENT.PLACE, state.soundEnabled);
      if (removedDiceCount > 0) {
        playGameSfx(GAME_SFX_EVENT.REMOVE, state.soundEnabled);
      }

      const status = getGameStatus({
        player: nextBoards.seat1Board,
        bot: nextBoards.seat2Board,
      });
      const finished = status === GAME_STATUS.FINISHED;
      const isPvb = state.gameMode === GAME_MODE.PVB;
      const nextTurnState = resolveNextTurnState({
        finished,
        isPvb,
        isSeat1Turn: isPlayerTurn,
        currentTurn: state.turn,
        deps,
      });

      set({
        ...createSeatBoardState(nextBoards),
        ...createSeatScoreState(seatScores),
        ...nextTurnState,
      });

      if (finished) {
        get().finishGame();
      }
    },
    botMove: () => {
      const state = get();

      if (state.gameMode !== GAME_MODE.PVB || state.phase !== GAME_PHASE.BOT_TURN) {
        return;
      }

      const availableColumns = getAvailableColumns(state.seat2Board);
      if (availableColumns.length === 0) {
        get().finishGame();
        return;
      }

      const roll = deps.diceSource.getNextRoll();
      const botColumn = chooseBotColumn({
        playerBoard: state.seat1Board,
        botBoard: state.seat2Board,
        dieValue: roll,
        difficulty: state.botDifficulty,
      });

      const { nextCurrentBoard, nextOpponentBoard } = applyMove({
        currentBoard: state.seat2Board,
        opponentBoard: state.seat1Board,
        columnIndex: botColumn,
        dieValue: roll,
      });

      const nextBoards = {
        seat1Board: nextOpponentBoard,
        seat2Board: nextCurrentBoard,
      };
      const seatScores = buildSeatScoresFromBoards(nextBoards);
      const removedDiceCount = state.seat1Board[botColumn].length - nextOpponentBoard[botColumn].length;

      playGameSfx(GAME_SFX_EVENT.PLACE, state.soundEnabled);
      if (removedDiceCount > 0) {
        playGameSfx(GAME_SFX_EVENT.REMOVE, state.soundEnabled);
      }

      const status = getGameStatus({
        player: nextOpponentBoard,
        bot: nextCurrentBoard,
      });

      const finished = status === GAME_STATUS.FINISHED;
      const nextTurnState = resolveNextTurnState({
        finished,
        isPvb: false,
        isSeat1Turn: false,
        currentTurn: state.turn,
        deps,
      });

      set({
        ...createSeatBoardState(nextBoards),
        ...createSeatScoreState(seatScores),
        ...nextTurnState,
      });

      if (finished) {
        get().finishGame();
      }
    },
    recalculateScores: () => {
      const state = get();
      set({
        ...createSeatScoreState({
          seat1: scoreBoard(state.seat1Board),
          seat2: scoreBoard(state.seat2Board),
        }),
      });
    },
    finishGame: () => {
      const state = get();
      const finalSeatScores = buildSeatScoresFromBoards({
        seat1Board: state.seat1Board,
        seat2Board: state.seat2Board,
      });
      const result = determineResult(state.seat1Board, state.seat2Board);
      const winner = resolveFinishedWinner(result);
      playGameSfx(resolveFinishSfxEvent(winner), state.soundEnabled);

      set({
        phase: GAME_PHASE.FINISHED,
        status: GAME_STATUS.FINISHED,
        ...createSeatScoreState(finalSeatScores),
        winner,
        currentRoll: null,
        interactionLocked: true,
        reportStatus: state.gameMode === GAME_MODE.PVB ? "pending" : "idle",
        reportedAt: null,
        reportError: null,
      });
    },
    rematch: () => {
      const boards = createInitialBoards();
      set(
        createStartedMatchState({
          deps,
          seat1Board: boards.player,
          seat2Board: boards.bot,
        }),
      );
    },
    resetGame: () => {
      const state = get();
      set(
        createInitialGameStoreState({
          botDifficulty: state.botDifficulty,
          soundEnabled: state.soundEnabled,
          gameMode: state.gameMode,
        }),
      );
    },
    setReportStatus: (status, options) => {
      set({
        reportStatus: status,
        reportedAt: options?.reportedAt ?? null,
        reportError: options?.reportError ?? null,
      });
    },
    setOnlineSession: ({ roomId, seat }) => {
      set({
        onlineRoomId: roomId,
        onlineMySeat: seat,
      });
    },
    applyOnlineServerState: (params) => {
      const state = get();
      set({
        ...createSeatBoardState({
          seat1Board: params.seat1Board,
          seat2Board: params.seat2Board,
        }),
        currentRoll: params.currentRoll,
        phase: params.phase,
        ...createSeatScoreState({
          seat1: params.seatScores.seat1,
          seat2: params.seatScores.seat2,
        }),
        winner: params.winner,
        status: params.phase === GAME_PHASE.FINISHED ? GAME_STATUS.FINISHED : GAME_STATUS.IN_PROGRESS,
        interactionLocked: params.phase === GAME_PHASE.FINISHED,
        onlineRevision: params.revision,
        onlineTurnUserId: params.turnUserId,
        onlineLastSyncAt: Date.now(),
        reportStatus: resolveReportStatusForOnlineSync({
          phase: params.phase,
          gameMode: state.gameMode,
          currentReportStatus: state.reportStatus,
        }),
      });
    },
    clearOnlineSession: () => {
      set({
        onlineRoomId: null,
        onlineMySeat: null,
        onlineTurnUserId: null,
        onlineRevision: 0,
        onlineLastSyncAt: null,
      });
    },
  };
}
