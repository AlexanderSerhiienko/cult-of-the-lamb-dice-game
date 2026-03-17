"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { GameHeaderActions } from "@/components/layout/game-header-actions";
import { HeaderAccountPanel } from "@/components/layout/header-account-panel";
import { OnlineHeaderActions } from "@/components/layout/online-header-actions";
import { GAME_STATUS } from "@/features/game/core/types";
import { useGameStore } from "@/features/game/store/use-game-store";
import { leaveRoom } from "@/features/online/api";
import { useRouteLeave } from "@/hooks/use-route-leave";

type AppShellProps = {
  children: ReactNode;
};

function getOnlineRoomId(pathname: string): string | null {
  const match = pathname.match(/^\/online\/room\/([^/]+)\/play$/);
  return match?.[1] ?? null;
}

function getShellRouteContext(pathname: string) {
  const isHomeRoute = pathname === "/";
  const isGameRoute = pathname.startsWith("/game");
  const isOnlineEntryRoute = pathname === "/online";
  const isOnlineLobbyRoute = /^\/online\/room\/[^/]+$/.test(pathname);
  const isOnlinePlayRoute = /^\/online\/room\/[^/]+\/play$/.test(pathname);
  const isRankedRoute = pathname === "/ranked";
  const isRankedMatchRoute = /^\/ranked\/match\/[^/]+$/.test(pathname);

  return {
    isHomeRoute,
    isGameRoute,
    isOnlineRoute: isOnlineEntryRoute || isOnlineLobbyRoute || isOnlinePlayRoute,
    isOnlineEntryRoute,
    isOnlineLobbyRoute,
    isOnlinePlayRoute,
    isRankedRoute,
    isRankedMatchRoute,
    showGameActions: isGameRoute,
    showOnlineActions: isOnlinePlayRoute,
    showRankedSegment: !isRankedRoute && !isRankedMatchRoute && !isOnlinePlayRoute,
    onlineRoomId: isOnlinePlayRoute ? getOnlineRoomId(pathname) : null,
    contextLabel:
      isOnlinePlayRoute
        ? "Online match"
        : isOnlineLobbyRoute
          ? "Online room"
          : isOnlineEntryRoute
            ? "Online"
            : isRankedMatchRoute
              ? "Ranked match"
              : isRankedRoute
                ? "Ranked"
                : isGameRoute
                  ? "Game"
                  : null,
  };
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const routeContext = getShellRouteContext(pathname);
  const startGame = useGameStore((state) => state.startGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const status = useGameStore((state) => state.status);
  const [isLeavingOnlineMatch, setIsLeavingOnlineMatch] = useState(false);

  async function handleLeaveOnlineMatch() {
    if (!routeContext.onlineRoomId || isLeavingOnlineMatch) {
      return;
    }

    setIsLeavingOnlineMatch(true);
    try {
      await leaveRoom(routeContext.onlineRoomId);
      router.push("/");
    } finally {
      setIsLeavingOnlineMatch(false);
    }
  }

  useRouteLeave({
    pathname,
    isInScope: (path) => path === "/game" || path.startsWith("/game/"),
    onLeave: resetGame,
  });

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="shrink-0 text-lg font-semibold tracking-[0.08em] text-slate-100">
              Knucklebones
            </Link>
            {routeContext.contextLabel ? (
              <span className="hidden text-xs font-medium uppercase tracking-[0.22em] text-slate-500 sm:inline">
                {routeContext.contextLabel}
              </span>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-3 lg:min-w-0 lg:flex-row lg:items-center lg:justify-end">
            {(routeContext.showGameActions || routeContext.showOnlineActions) ? (
              <div className="flex min-w-0 items-center justify-start rounded-2xl border border-slate-800/80 bg-slate-900/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] lg:justify-center">
                {routeContext.showGameActions ? (
                  <GameHeaderActions
                    onStartGame={startGame}
                    onResetGame={resetGame}
                    isResetDisabled={status === GAME_STATUS.IDLE}
                  />
                ) : null}
                {routeContext.showOnlineActions ? (
                  <OnlineHeaderActions
                    onLeaveMatch={handleLeaveOnlineMatch}
                    isLeaving={isLeavingOnlineMatch}
                  />
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-start lg:justify-end">
              <HeaderAccountPanel showRankedSegment={routeContext.showRankedSegment} />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-4">{children}</main>
    </div>
  );
}
