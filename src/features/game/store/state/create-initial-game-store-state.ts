import { createInitialBoards } from "@/features/game/core/rules";
import { GAME_PHASE, GAME_STATUS, PLAYER } from "@/features/game/core/types";
import type { BotDifficulty, GameMode } from "@/features/game/core/types";
import type { GameStoreState } from "@/features/game/store/types/game-store";

export function createInitialGameStoreState(params: {
  botDifficulty: BotDifficulty;
  soundEnabled: boolean;
  gameMode: GameMode;
}): GameStoreState {
  const { botDifficulty, soundEnabled, gameMode } = params;
  const boards = createInitialBoards();

  return {
    seat1Board: boards.player,
    seat2Board: boards.bot,
    currentRoll: null,
    turn: PLAYER.PLAYER,
    phase: GAME_PHASE.IDLE,
    interactionLocked: false,
    seatScores: { seat1: 0, seat2: 0 },
    status: GAME_STATUS.IDLE,
    winner: null,
    botDifficulty,
    soundEnabled,
    gameMode,
    matchId: null,
    reportStatus: "idle",
    reportedAt: null,
    reportError: null,
    onlineRoomId: null,
    onlineMySeat: null,
    onlineTurnUserId: null,
    onlineRevision: 0,
    onlineLastSyncAt: null,
  };
}
