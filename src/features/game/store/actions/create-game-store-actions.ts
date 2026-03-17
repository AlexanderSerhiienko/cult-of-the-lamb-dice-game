import type { StoreApi } from "zustand";
import { chooseBotColumn } from "@/features/game/core/bot";
import {
  applyMove,
  createInitialBoards,
  determineResult,
  getAvailableColumns,
  getGameStatus,
  rollDie,
  scoreBoard,
} from "@/features/game/core/rules";
import { GAME_MODE, GAME_PHASE, GAME_RESULT, GAME_STATUS, PLAYER } from "@/features/game/core/types";
import type { GameWinner } from "@/features/game/core/types";
import { GAME_SFX_EVENT, playGameSfx } from "@/features/game/sound/game-sfx";
import { createInitialGameStoreState } from "@/features/game/store/state/create-initial-game-store-state";
import { writeBotDifficulty } from "@/features/game/store/storage/bot-difficulty-storage";
import { writeSoundEnabled } from "@/features/game/store/storage/sound-storage";
import type { GameStore, GameStoreActions } from "@/features/game/store/types/game-store";

type SetState = StoreApi<GameStore>["setState"];
type GetState = StoreApi<GameStore>["getState"];

function createMatchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

export function createGameStoreActions(params: {
  set: SetState;
  get: GetState;
}): GameStoreActions {
  const { set, get } = params;

  return {
    startGame: () => {
      const boards = createInitialBoards();
      set({
        ...createSeatBoardState({
          seat1Board: boards.player,
          seat2Board: boards.bot,
        }),
        currentRoll: rollDie(),
        turn: PLAYER.PLAYER,
        phase: GAME_PHASE.PLAYER_TURN,
        interactionLocked: false,
        ...createSeatScoreState({ seat1: 0, seat2: 0 }),
        status: GAME_STATUS.IN_PROGRESS,
        winner: null,
        matchId: createMatchId(),
        reportStatus: "idle",
        reportedAt: null,
        reportError: null,
      });
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

      const { nextCurrentBoard, nextOpponentBoard } = applyMove({
        currentBoard: activeBoard,
        opponentBoard: passiveBoard,
        columnIndex,
        dieValue: state.currentRoll,
      });

      const nextSeat1Board = isPlayerTurn ? nextCurrentBoard : nextOpponentBoard;
      const nextSeat2Board = isPlayerTurn ? nextOpponentBoard : nextCurrentBoard;
      const seatScores = {
        seat1: scoreBoard(nextSeat1Board),
        seat2: scoreBoard(nextSeat2Board),
      };
      const removedDiceCount = isPlayerTurn
        ? state.seat2Board[columnIndex].length - nextSeat2Board[columnIndex].length
        : state.seat1Board[columnIndex].length - nextSeat1Board[columnIndex].length;

      playGameSfx(GAME_SFX_EVENT.PLACE, state.soundEnabled);
      if (removedDiceCount > 0) {
        playGameSfx(GAME_SFX_EVENT.REMOVE, state.soundEnabled);
      }

      const status = getGameStatus({
        player: nextSeat1Board,
        bot: nextSeat2Board,
      });

      const finished = status === GAME_STATUS.FINISHED;
      const isPvb = state.gameMode === GAME_MODE.PVB;
      const nextTurn = finished
        ? state.turn
        : isPlayerTurn
          ? PLAYER.BOT
          : PLAYER.PLAYER;
      const nextPhase = finished
        ? GAME_PHASE.FINISHED
        : isPlayerTurn
          ? GAME_PHASE.BOT_TURN
          : GAME_PHASE.PLAYER_TURN;
      const nextRoll = finished ? null : isPvb ? null : rollDie();

      set({
        ...createSeatBoardState({
          seat1Board: nextSeat1Board,
          seat2Board: nextSeat2Board,
        }),
        currentRoll: nextRoll,
        turn: nextTurn,
        phase: nextPhase,
        interactionLocked: finished,
        ...createSeatScoreState(seatScores),
        status,
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

      const roll = rollDie();
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

      const seatScores = {
        seat1: scoreBoard(nextOpponentBoard),
        seat2: scoreBoard(nextCurrentBoard),
      };
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

      set({
        ...createSeatBoardState({
          seat1Board: nextOpponentBoard,
          seat2Board: nextCurrentBoard,
        }),
        currentRoll: finished ? null : rollDie(),
        turn: finished ? state.turn : PLAYER.PLAYER,
        phase: finished ? GAME_PHASE.FINISHED : GAME_PHASE.PLAYER_TURN,
        interactionLocked: finished,
        ...createSeatScoreState(seatScores),
        status,
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
      const finalSeatScores = {
        seat1: scoreBoard(state.seat1Board),
        seat2: scoreBoard(state.seat2Board),
      };
      const result = determineResult(state.seat1Board, state.seat2Board);
      const winner: GameWinner =
        result === GAME_RESULT.DRAW
          ? GAME_RESULT.DRAW
          : result === GAME_RESULT.WIN
            ? PLAYER.PLAYER
            : PLAYER.BOT;

      if (winner === PLAYER.PLAYER) {
        playGameSfx(GAME_SFX_EVENT.VICTORY, state.soundEnabled);
      } else if (winner === PLAYER.BOT) {
        playGameSfx(GAME_SFX_EVENT.DEFEAT, state.soundEnabled);
      } else {
        playGameSfx(GAME_SFX_EVENT.DRAW, state.soundEnabled);
      }

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
      set({
        ...createSeatBoardState({
          seat1Board: boards.player,
          seat2Board: boards.bot,
        }),
        currentRoll: rollDie(),
        turn: PLAYER.PLAYER,
        phase: GAME_PHASE.PLAYER_TURN,
        interactionLocked: false,
        ...createSeatScoreState({ seat1: 0, seat2: 0 }),
        status: GAME_STATUS.IN_PROGRESS,
        winner: null,
        matchId: createMatchId(),
        reportStatus: "idle",
        reportedAt: null,
        reportError: null,
      });
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
        reportStatus:
          params.phase === GAME_PHASE.FINISHED && state.gameMode === GAME_MODE.ONLINE_PRIVATE
            ? "pending"
            : state.reportStatus,
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
