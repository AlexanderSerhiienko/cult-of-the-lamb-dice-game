import { createContext, createElement, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { GAME_MODE } from "@/features/game/core/types";
import { createGameStore, type CreateGameStoreOptions } from "@/features/game/store/create-game-store";
import { createInitialGameStoreState } from "@/features/game/store/state/create-initial-game-store-state";
import type { GameStore } from "@/features/game/store/types/game-store";

const defaultGameStore = createGameStore();
const GameStoreContext = createContext<typeof defaultGameStore | null>(null);

type UseGameStore = {
  <T>(selector: (state: GameStore) => T): T;
  getState: typeof defaultGameStore.getState;
  setState: typeof defaultGameStore.setState;
  subscribe: typeof defaultGameStore.subscribe;
};

const useGameStoreBase = <T,>(selector: (state: GameStore) => T) => {
  const scopedStore = useContext(GameStoreContext) ?? defaultGameStore;
  return useStore(scopedStore, selector);
};

export const useGameStore = useGameStoreBase as UseGameStore;
useGameStore.getState = defaultGameStore.getState;
useGameStore.setState = defaultGameStore.setState;
useGameStore.subscribe = defaultGameStore.subscribe;

export function GameStoreProvider({
  children,
  store,
  options,
}: {
  children: ReactNode;
  store?: typeof defaultGameStore;
  options?: CreateGameStoreOptions;
}) {
  const [storeInstance] = useState(() => store ?? createGameStore(options));

  return createElement(GameStoreContext.Provider, { value: storeInstance }, children);
}

export function resetDefaultGameStore() {
  defaultGameStore.setState(
    createInitialGameStoreState({
      botDifficulty: defaultGameStore.getState().botDifficulty,
      soundEnabled: defaultGameStore.getState().soundEnabled,
      gameMode: GAME_MODE.PVB,
    }),
  );
}

export { createGameStore };
