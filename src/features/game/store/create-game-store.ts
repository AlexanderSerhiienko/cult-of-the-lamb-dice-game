import { createStore, type StoreApi } from "zustand/vanilla";
import { GAME_MODE } from "@/features/game/core/types";
import { createGameStoreActions } from "@/features/game/store/actions/create-game-store-actions";
import { createDefaultGameStoreDependencies, type GameStoreDependencies } from "@/features/game/store/game-store-deps";
import { createInitialGameStoreState } from "@/features/game/store/state/create-initial-game-store-state";
import { readBotDifficulty } from "@/features/game/store/storage/bot-difficulty-storage";
import { readSoundEnabled } from "@/features/game/store/storage/sound-storage";
import type { GameStore, GameStoreState } from "@/features/game/store/types/game-store";

export type CreateGameStoreOptions = {
  initialState?: Partial<GameStoreState>;
  deps?: Partial<GameStoreDependencies>;
};

export function createGameStore(options: CreateGameStoreOptions = {}): StoreApi<GameStore> {
  const deps = {
    ...createDefaultGameStoreDependencies(),
    ...options.deps,
  };
  const initialState = {
    ...createInitialGameStoreState({
      botDifficulty: readBotDifficulty(),
      soundEnabled: readSoundEnabled(),
      gameMode: GAME_MODE.PVB,
    }),
    ...options.initialState,
  };

  return createStore<GameStore>((set, get) => ({
    ...initialState,
    ...createGameStoreActions({ set, get, deps }),
  }));
}
