"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { MenuActionButton } from "@/components/home/menu-action-button";
import { getReconnectCtaLabel } from "@/features/online/types";

type ActiveMatchPayload = {
  activeMatch: {
    roomId: string;
    matchId: string;
    reconnectDeadlineMs: number | null;
  } | null;
};

export function ActiveMatchAction() {
  const { status } = useSession();
  const pathname = usePathname();
  const [activeMatch, setActiveMatch] = useState<ActiveMatchPayload["activeMatch"]>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let disposed = false;
    let intervalId: number | null = null;
    const load = async () => {
      try {
        const response = await fetch("/api/rooms/active", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as ActiveMatchPayload | null;
        if (!disposed) {
          setActiveMatch(payload?.activeMatch ?? null);
        }
      } catch {
        // Preserve the last known active match on transient fetch failures.
      }
    };

    const restartPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }

      if (document.visibilityState !== "visible") {
        return;
      }

      intervalId = window.setInterval(() => {
        void load();
      }, 15_000);
    };

    void load();
    const onFocus = () => {
      void load();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
      restartPolling();
    };

    restartPolling();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    if (!activeMatch) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeMatch]);

  if (!isAuthenticated) {
    return null;
  }

  if (!activeMatch) {
    return null;
  }

  return (
    <MenuActionButton href={`/online/room/${activeMatch.roomId}/play?matchId=${activeMatch.matchId}`}>
      {getReconnectCtaLabel({
        reconnectDeadlineMs: activeMatch.reconnectDeadlineMs,
        nowMs,
      })}
    </MenuActionButton>
  );
}
