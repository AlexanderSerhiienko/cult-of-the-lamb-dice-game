import { create } from "zustand";
import { createGameStoreActions } from "@/features/game/store/actions/create-game-store-actions";
import { createInitialGameStoreState } from "@/features/game/store/state/create-initial-game-store-state";
import { readBotDifficulty } from "@/features/game/store/storage/bot-difficulty-storage";
import { readSoundEnabled } from "@/features/game/store/storage/sound-storage";
import type { GameStore } from "@/features/game/store/types/game-store";

export const useGameStore = create<GameStore>((set, get) => {
  const initialState = createInitialGameStoreState({
    botDifficulty: readBotDifficulty(),
    soundEnabled: readSoundEnabled(),
  });

  return {
    ...initialState,
    ...createGameStoreActions({ set, get }),
  };
});
