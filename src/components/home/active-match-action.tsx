"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { MenuActionButton } from "@/components/home/menu-action-button";

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

    void load();
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      disposed = true;
      window.removeEventListener("focus", onFocus);
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

  const reconnectSecondsLeft =
    typeof activeMatch.reconnectDeadlineMs === "number"
      ? Math.max(0, Math.ceil((activeMatch.reconnectDeadlineMs - nowMs) / 1000))
    : null;

  return (
    <MenuActionButton href={`/online/room/${activeMatch.roomId}/play?matchId=${activeMatch.matchId}`}>
      {reconnectSecondsLeft !== null && reconnectSecondsLeft > 0
        ? `Reconnect to active match (${reconnectSecondsLeft}s)`
        : "Return to active match"}
    </MenuActionButton>
  );
}
