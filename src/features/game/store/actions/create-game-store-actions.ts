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
import { GAME_PHASE, GAME_RESULT, GAME_STATUS, PLAYER } from "@/features/game/core/types";
import type { GameWinner } from "@/features/game/core/types";
import { GAME_SFX_EVENT, playGameSfx } from "@/features/game/sound/game-sfx";
import { createInitialGameStoreState } from "@/features/game/store/state/create-initial-game-store-state";
import { writeBotDifficulty } from "@/features/game/store/storage/bot-difficulty-storage";
import { writeSoundEnabled } from "@/features/game/store/storage/sound-storage";
import type { GameStore, GameStoreActions } from "@/features/game/store/types/game-store";

type SetState = StoreApi<GameStore>["setState"];
type GetState = StoreApi<GameStore>["getState"];

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
      });
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

      if (
        state.interactionLocked ||
        state.phase !== GAME_PHASE.PLAYER_TURN ||
        state.currentRoll === null
      ) {
        return;
      }

      const availableColumns = getAvailableColumns(state.playerBoard);
      if (!availableColumns.includes(columnIndex)) {
        return;
      }

      set({ interactionLocked: true });

      const { nextCurrentBoard, nextOpponentBoard } = applyMove({
        currentBoard: state.playerBoard,
        opponentBoard: state.botBoard,
        columnIndex,
        dieValue: state.currentRoll,
      });

      const scores = {
        player: scoreBoard(nextCurrentBoard),
        bot: scoreBoard(nextOpponentBoard),
      };
      const removedDiceCount = state.botBoard[columnIndex].length - nextOpponentBoard[columnIndex].length;

      playGameSfx(GAME_SFX_EVENT.PLACE, state.soundEnabled);
      if (removedDiceCount > 0) {
        playGameSfx(GAME_SFX_EVENT.REMOVE, state.soundEnabled);
      }

      const status = getGameStatus({
        player: nextCurrentBoard,
        bot: nextOpponentBoard,
      });

      const finished = status === GAME_STATUS.FINISHED;

      set({
        playerBoard: nextCurrentBoard,
        botBoard: nextOpponentBoard,
        currentRoll: null,
        turn: finished ? state.turn : PLAYER.BOT,
        phase: finished ? GAME_PHASE.FINISHED : GAME_PHASE.BOT_TURN,
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

      if (state.phase !== GAME_PHASE.BOT_TURN) {
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
      });
    },
    resetGame: () => {
      const state = get();
      set(
        createInitialGameStoreState({
          botDifficulty: state.botDifficulty,
          soundEnabled: state.soundEnabled,
        }),
      );
    },
  };
}
