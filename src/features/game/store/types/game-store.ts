import type {
  Board,
  BotDifficulty,
  ColumnIndex,
  DieValue,
  GameMode,
  GamePhase,
  GameStatus,
  GameWinner,
  PlayerScores,
  Turn,
} from "@/features/game/core/types";

export type GameStoreState = {
  playerBoard: Board;
  botBoard: Board;
  currentRoll: DieValue | null;
  turn: Turn;
  phase: GamePhase;
  interactionLocked: boolean;
  scores: PlayerScores;
  status: GameStatus;
  winner: GameWinner | null;
  botDifficulty: BotDifficulty;
  soundEnabled: boolean;
  gameMode: GameMode;
};

export type GameStoreActions = {
  startGame: () => void;
  setGameMode: (mode: GameMode) => void;
  setBotDifficulty: (difficulty: BotDifficulty) => void;
  setSoundEnabled: (enabled: boolean) => void;
  placePlayerDie: (columnIndex: ColumnIndex) => void;
  botMove: () => void;
  recalculateScores: () => void;
  finishGame: () => void;
  rematch: () => void;
  resetGame: () => void;
};

export type GameStore = GameStoreState & GameStoreActions;
