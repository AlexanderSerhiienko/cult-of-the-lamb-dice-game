"use client";

import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import type { Session } from "next-auth";
import { GameStoreProvider, createGameStore } from "@/features/game/store/use-game-store";
import { setMockParams, setMockPathname, setMockRouter, setMockSearchParams } from "@/test/mock-navigation";
import { setMockSessionState } from "@/test/mock-session";
import type { CreateGameStoreOptions } from "@/features/game/store/create-game-store";

type RenderWithProvidersOptions = {
  pathname?: string;
  params?: Record<string, string>;
  searchParams?: Record<string, string> | URLSearchParams;
  session?: {
    status: "loading" | "authenticated" | "unauthenticated";
    data?: Session | null;
  };
  router?: Partial<{
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
    refresh: () => void;
    prefetch: (href: string) => Promise<void>;
  }>;
  storeOptions?: CreateGameStoreOptions;
};

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  setMockPathname(options.pathname ?? "/");
  setMockParams(options.params ?? {});
  setMockSearchParams(options.searchParams ?? {});
  if (options.router) {
    setMockRouter(options.router);
  }
  setMockSessionState({
    status: options.session?.status ?? "unauthenticated",
    data: options.session?.data ?? null,
  });

  const store = createGameStore(options.storeOptions);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <GameStoreProvider store={store}>{children}</GameStoreProvider>
  );

  return {
    user: userEvent.setup(),
    store,
    ...render(ui, { wrapper: Wrapper }),
  };
}
