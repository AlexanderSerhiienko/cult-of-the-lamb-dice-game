import type {
  Board,
  BotDifficulty,
  ColumnIndex,
  DieValue,
  GameMode,
  GamePhase,
  GameStatus,
  GameWinner,
  Turn,
} from "@/features/game/core/types";

export type SeatScores = {
  seat1: number;
  seat2: number;
};

export type GameStoreState = {
  seat1Board: Board;
  seat2Board: Board;
  currentRoll: DieValue | null;
  turn: Turn;
  phase: GamePhase;
  interactionLocked: boolean;
  seatScores: SeatScores;
  status: GameStatus;
  winner: GameWinner | null;
  botDifficulty: BotDifficulty;
  soundEnabled: boolean;
  gameMode: GameMode;
  matchId: string | null;
  reportStatus: "idle" | "pending" | "sending" | "sent" | "failed";
  reportedAt: number | null;
  reportError: string | null;
  onlineRoomId: string | null;
  onlineMySeat: 1 | 2 | null;
  onlineTurnUserId: string | null;
  onlineRevision: number;
  onlineLastSyncAt: number | null;
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
  setReportStatus: (
    status: GameStoreState["reportStatus"],
    options?: {
      reportedAt?: number | null;
      reportError?: string | null;
    },
  ) => void;
  setOnlineSession: (params: { roomId: string; seat: 1 | 2 | null }) => void;
  applyOnlineServerState: (params: {
    seat1Board: Board;
    seat2Board: Board;
    currentRoll: DieValue | null;
    phase: GamePhase;
    seatScores: { seat1: number; seat2: number };
    winner: GameWinner | null;
    revision: number;
    turnUserId: string | null;
  }) => void;
  clearOnlineSession: () => void;
};

export type GameStore = GameStoreState & GameStoreActions;
