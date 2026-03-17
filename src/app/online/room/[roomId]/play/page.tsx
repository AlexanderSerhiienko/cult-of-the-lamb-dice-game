"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { OnlineGameContent } from "@/features/online/components/online-game-content";
import { OnlineStatusBanner } from "@/features/online/components/online-status-banner";
import { useOnlineRoomSocket } from "@/features/online/hooks/use-online-room-socket";
import { isOnlineInteractionBlocked } from "@/features/online/types";
import { useGameStore } from "@/features/game/store/use-game-store";

export default function OnlinePlayPage() {
  const { data: session, status } = useSession();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const mySeat = useGameStore((state) => state.onlineMySeat);

  const roomId = params.roomId;
  const userId = session?.user?.id;
  const canRun = status === "authenticated" && typeof roomId === "string" && !!matchId && !!userId;

  const socket = useOnlineRoomSocket({
    roomId: canRun ? roomId : "",
    matchId: canRun ? matchId : "",
    userId: canRun ? userId : "",
    enabled: canRun,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!socket.opponentDisconnectDeadlineMs) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [socket.opponentDisconnectDeadlineMs]);

  const reconnectSecondsLeft =
    socket.opponentDisconnectDeadlineMs === null
      ? null
      : Math.max(0, Math.ceil((socket.opponentDisconnectDeadlineMs - nowMs) / 1000));

  if (!canRun) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm text-slate-300">Loading online match...</p>
      </section>
    );
  }

  if (!mySeat) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <OnlineStatusBanner
          status={socket.status}
          opponentDisconnectSecondsLeft={reconnectSecondsLeft}
          error={socket.error}
        />
      </section>
    );
  }

  return (
    <OnlineGameContent
      mySeat={mySeat}
      userId={userId}
      onSelectColumn={socket.sendMove}
      interactionBlocked={isOnlineInteractionBlocked(socket.status)}
      statusBanner={
        <OnlineStatusBanner
          status={socket.status}
          opponentDisconnectSecondsLeft={reconnectSecondsLeft}
          error={socket.error}
        />
      }
    />
  );
}
