"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { AuthControls } from "@/components/auth/auth-controls";
import { GameHeaderActions } from "@/components/layout/game-header-actions";
import { OnlineHeaderActions } from "@/components/layout/online-header-actions";
import { Modal } from "@/components/ui/modal";
import { ModalHeader } from "@/components/ui/modal-header";
import { GAME_STATUS } from "@/features/game/core/types";
import { MatchInfoContent } from "@/features/game/components/match-info-content";
import { RulesModalContent } from "@/features/game/components/rules-modal-content";
import { useGameStore } from "@/features/game/store/use-game-store";
import { leaveRoom } from "@/features/online/api";
import { useRouteLeave } from "@/hooks/use-route-leave";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isGameRoute = pathname.startsWith("/game");
  const isOnlinePlayRoute = /^\/online\/room\/[^/]+\/play$/.test(pathname);
  const onlineRoomId = isOnlinePlayRoute ? pathname.split("/")[3] ?? null : null;
  const startGame = useGameStore((state) => state.startGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const status = useGameStore((state) => state.status);
  const phase = useGameStore((state) => state.phase);
  const interactionLocked = useGameStore((state) => state.interactionLocked);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMatchInfoOpen, setIsMatchInfoOpen] = useState(false);
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

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <div className="text-lg font-semibold text-slate-100">Knucklebones</div>
          <div className="flex items-center gap-3">
            {isGameRoute ? (
              <GameHeaderActions
                onStartGame={startGame}
                onResetGame={resetGame}
                onOpenRules={() => setIsRulesOpen(true)}
                onOpenMatchInfo={() => setIsMatchInfoOpen(true)}
                isResetDisabled={status === GAME_STATUS.IDLE}
              />
            ) : null}
            {isOnlinePlayRoute ? (
              <OnlineHeaderActions
                onLeaveMatch={handleLeaveOnlineMatch}
                isLeaving={isLeavingOnlineMatch}
              />
            ) : null}
            <AuthControls />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-4">{children}</main>

      <Modal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} contentClassName="max-w-xl">
        <ModalHeader title="Rules" onClose={() => setIsRulesOpen(false)} />
        <RulesModalContent />
      </Modal>

      <Modal isOpen={isMatchInfoOpen} onClose={() => setIsMatchInfoOpen(false)} contentClassName="max-w-sm">
        <ModalHeader title="Match info" onClose={() => setIsMatchInfoOpen(false)} />
        <MatchInfoContent
          status={status}
          phase={phase}
          inputState={interactionLocked ? "locked" : "available"}
        />
      </Modal>
    </div>
  );
}
