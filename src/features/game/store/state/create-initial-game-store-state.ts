import { createInitialBoards } from "@/features/game/core/rules";
import { GAME_PHASE, GAME_STATUS, PLAYER } from "@/features/game/core/types";
import type { BotDifficulty } from "@/features/game/core/types";
import type { GameStoreState } from "@/features/game/store/types/game-store";

export function createInitialGameStoreState(params: {
  botDifficulty: BotDifficulty;
  soundEnabled: boolean;
}): GameStoreState {
  const { botDifficulty, soundEnabled } = params;
  const boards = createInitialBoards();

  return {
    playerBoard: boards.player,
    botBoard: boards.bot,
    currentRoll: null,
    turn: PLAYER.PLAYER,
    phase: GAME_PHASE.IDLE,
    interactionLocked: false,
    scores: { player: 0, bot: 0 },
    status: GAME_STATUS.IDLE,
    winner: null,
    botDifficulty,
    soundEnabled,
  };
}
