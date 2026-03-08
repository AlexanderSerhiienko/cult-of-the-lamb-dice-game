import { create } from "zustand";
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
import type {
  Board,
  ColumnIndex,
  DieValue,
  GamePhase,
  GameStatus,
  GameWinner,
  PlayerScores,
  Turn,
} from "@/features/game/core/types";

type GameState = {
  playerBoard: Board;
  botBoard: Board;
  currentRoll: DieValue | null;
  turn: Turn;
  phase: GamePhase;
  interactionLocked: boolean;
  scores: PlayerScores;
  status: GameStatus;
  winner: GameWinner | null;
  startGame: () => void;
  placePlayerDie: (columnIndex: ColumnIndex) => void;
  botMove: () => void;
  recalculateScores: () => void;
  finishGame: () => void;
  rematch: () => void;
  resetGame: () => void;
};

const initialBoards = createInitialBoards();

const initialState: Omit<
  GameState,
  | "startGame"
  | "placePlayerDie"
  | "botMove"
  | "recalculateScores"
  | "finishGame"
  | "rematch"
  | "resetGame"
> = {
  playerBoard: initialBoards.player,
  botBoard: initialBoards.bot,
  currentRoll: null,
  turn: "player",
  phase: "idle",
  interactionLocked: false,
  scores: { player: 0, bot: 0 },
  status: "idle",
  winner: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  startGame: () => {
    const boards = createInitialBoards();
    set({
      playerBoard: boards.player,
      botBoard: boards.bot,
      currentRoll: rollDie(),
      turn: "player",
      phase: "player_turn",
      interactionLocked: false,
      scores: { player: 0, bot: 0 },
      status: "in_progress",
      winner: null,
    });
  },
  placePlayerDie: (columnIndex) => {
    const state = get();

    if (state.interactionLocked || state.phase !== "player_turn" || state.currentRoll === null) {
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

    const status = getGameStatus({
      player: nextCurrentBoard,
      bot: nextOpponentBoard,
    });

    const finished = status === "finished";

    set({
      playerBoard: nextCurrentBoard,
      botBoard: nextOpponentBoard,
      currentRoll: null,
      turn: finished ? state.turn : "bot",
      phase: finished ? "finished" : "bot_turn",
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

    if (state.phase !== "bot_turn") {
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

    const status = getGameStatus({
      player: nextOpponentBoard,
      bot: nextCurrentBoard,
    });

    const finished = status === "finished";

    set({
      playerBoard: nextOpponentBoard,
      botBoard: nextCurrentBoard,
      currentRoll: finished ? null : rollDie(),
      turn: finished ? state.turn : "player",
      phase: finished ? "finished" : "player_turn",
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
    const winner: GameWinner = result === "draw" ? "draw" : result === "win" ? "player" : "bot";

    set({
      phase: "finished",
      status: "finished",
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
      turn: "player",
      phase: "player_turn",
      interactionLocked: false,
      scores: { player: 0, bot: 0 },
      status: "in_progress",
      winner: null,
    });
  },
  resetGame: () => set(initialState),
}));
