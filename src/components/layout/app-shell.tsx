"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { AuthControls } from "@/components/auth/auth-controls";
import { GameHeaderActions } from "@/components/layout/game-header-actions";
import { OnlineHeaderActions } from "@/components/layout/online-header-actions";
import { GAME_STATUS } from "@/features/game/core/types";
import { useGameStore } from "@/features/game/store/use-game-store";
import { leaveRoom } from "@/features/online/api";
import { useRouteLeave } from "@/hooks/use-route-leave";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHomeRoute = pathname === "/";
  const isGameRoute = pathname.startsWith("/game");
  const isOnlineRoute = pathname.startsWith("/online");
  const isOnlinePlayRoute = /^\/online\/room\/[^/]+\/play$/.test(pathname);
  const onlineRoomId = isOnlinePlayRoute ? pathname.split("/")[3] ?? null : null;
  const startGame = useGameStore((state) => state.startGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const status = useGameStore((state) => state.status);
  const [isLeavingOnlineMatch, setIsLeavingOnlineMatch] = useState(false);

  async function handleLeaveOnlineMatch() {
    if (!onlineRoomId || isLeavingOnlineMatch) {
      return;
    }

    setIsLeavingOnlineMatch(true);
    try {
      await leaveRoom(onlineRoomId);
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

  const showBackLink = !isHomeRoute;
  const contextLabel = isOnlinePlayRoute
    ? "Online match"
    : isOnlineRoute
      ? "Online"
      : isGameRoute
        ? "Game"
        : null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="shrink-0 text-lg font-semibold tracking-[0.08em] text-slate-100">
              Knucklebones
            </Link>
            {contextLabel ? (
              <span className="hidden text-xs font-medium uppercase tracking-[0.22em] text-slate-500 sm:inline">
                {contextLabel}
              </span>
            ) : null}
            {showBackLink ? (
              <Link
                href="/"
                className="ml-auto rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 sm:ml-0"
              >
                Back
              </Link>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-3 lg:min-w-0 lg:flex-row lg:items-center lg:justify-end">
            {(isGameRoute || isOnlinePlayRoute) ? (
              <div className="flex min-w-0 items-center justify-start rounded-2xl border border-slate-800/80 bg-slate-900/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] lg:justify-center">
                {isGameRoute ? (
                  <GameHeaderActions
                    onStartGame={startGame}
                    onResetGame={resetGame}
                    isResetDisabled={status === GAME_STATUS.IDLE}
                  />
                ) : null}
                {isOnlinePlayRoute ? (
                  <OnlineHeaderActions
                    onLeaveMatch={handleLeaveOnlineMatch}
                    isLeaving={isLeavingOnlineMatch}
                  />
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-start lg:justify-end">
              <AuthControls />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-4">{children}</main>
    </div>
  );
}
