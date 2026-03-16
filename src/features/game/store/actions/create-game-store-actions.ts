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

export function createGameStoreActions(params: {
  set: SetState;
  get: GetState;
}): GameStoreActions {
  const { set, get } = params;

  return {
    startGame: () => {
      const boards = createInitialBoards();
      set({
        playerBoard: boards.player,
        botBoard: boards.bot,
        currentRoll: rollDie(),
        turn: PLAYER.PLAYER,
        phase: GAME_PHASE.PLAYER_TURN,
        interactionLocked: false,
        scores: { player: 0, bot: 0 },
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
      const isPlayerTurn = state.phase === GAME_PHASE.PLAYER_TURN;
      const isLocalOpponentTurn =
        state.gameMode === GAME_MODE.LOCAL_PVP && state.phase === GAME_PHASE.BOT_TURN;
      const isHumanTurn = isPlayerTurn || isLocalOpponentTurn;

      if (state.interactionLocked || !isHumanTurn || state.currentRoll === null) {
        return;
      }

      const activeBoard = isPlayerTurn ? state.playerBoard : state.botBoard;
      const passiveBoard = isPlayerTurn ? state.botBoard : state.playerBoard;
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

      const nextPlayerBoard = isPlayerTurn ? nextCurrentBoard : nextOpponentBoard;
      const nextBotBoard = isPlayerTurn ? nextOpponentBoard : nextCurrentBoard;
      const scores = {
        player: scoreBoard(nextPlayerBoard),
        bot: scoreBoard(nextBotBoard),
      };
      const removedDiceCount = isPlayerTurn
        ? state.botBoard[columnIndex].length - nextBotBoard[columnIndex].length
        : state.playerBoard[columnIndex].length - nextPlayerBoard[columnIndex].length;

      playGameSfx(GAME_SFX_EVENT.PLACE, state.soundEnabled);
      if (removedDiceCount > 0) {
        playGameSfx(GAME_SFX_EVENT.REMOVE, state.soundEnabled);
      }

      const status = getGameStatus({
        player: nextPlayerBoard,
        bot: nextBotBoard,
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
        playerBoard: nextPlayerBoard,
        botBoard: nextBotBoard,
        currentRoll: nextRoll,
        turn: nextTurn,
        phase: nextPhase,
        interactionLocked: finished,
        scores,
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

      const availableColumns = getAvailableColumns(state.botBoard);
      if (availableColumns.length === 0) {
        get().finishGame();
        return;
      }

      const roll = rollDie();
      const botColumn = chooseBotColumn({
        botBoard: state.botBoard,
        playerBoard: state.playerBoard,
        dieValue: roll,
        difficulty: state.botDifficulty,
      });

      const { nextCurrentBoard, nextOpponentBoard } = applyMove({
        currentBoard: state.botBoard,
        opponentBoard: state.playerBoard,
        columnIndex: botColumn,
        dieValue: roll,
      });

      const scores = {
        player: scoreBoard(nextOpponentBoard),
        bot: scoreBoard(nextCurrentBoard),
      };
      const removedDiceCount = state.playerBoard[botColumn].length - nextOpponentBoard[botColumn].length;

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
        playerBoard: nextOpponentBoard,
        botBoard: nextCurrentBoard,
        currentRoll: finished ? null : rollDie(),
        turn: finished ? state.turn : PLAYER.PLAYER,
        phase: finished ? GAME_PHASE.FINISHED : GAME_PHASE.PLAYER_TURN,
        interactionLocked: finished,
        scores,
        status,
      });

      if (finished) {
        get().finishGame();
      }
    },
    recalculateScores: () => {
      const state = get();
      set({
        scores: {
          player: scoreBoard(state.playerBoard),
          bot: scoreBoard(state.botBoard),
        },
      });
    },
    finishGame: () => {
      const state = get();
      const finalScores = {
        player: scoreBoard(state.playerBoard),
        bot: scoreBoard(state.botBoard),
      };
      const result = determineResult(state.playerBoard, state.botBoard);
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
        scores: finalScores,
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
        playerBoard: boards.player,
        botBoard: boards.bot,
        currentRoll: rollDie(),
        turn: PLAYER.PLAYER,
        phase: GAME_PHASE.PLAYER_TURN,
        interactionLocked: false,
        scores: { player: 0, bot: 0 },
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
  };
}
