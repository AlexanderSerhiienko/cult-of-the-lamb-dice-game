"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { OnlineGameContent } from "@/features/online/components/online-game-content";
import { useOnlineRoomSocket } from "@/features/online/hooks/use-online-room-socket";
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
        <p className="text-sm text-slate-300">Connecting to room...</p>
        {socket.error ? <p className="mt-3 text-sm text-rose-300">{socket.error}</p> : null}
      </section>
    );
  }

  return (
    <div>
      {socket.opponentDisconnected ? (
        <div className="mb-3 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Opponent disconnected. Waiting for reconnect: {reconnectSecondsLeft ?? 0}s. After timeout, win is
          granted automatically.
        </div>
      ) : null}
      {socket.opponentConnectionState === "left_match" ? (
        <div className="mb-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Opponent left the match. You win immediately.
        </div>
      ) : null}
      <OnlineGameContent mySeat={mySeat} userId={userId} onSelectColumn={socket.sendMove} />
      {socket.error ? <p className="mt-3 text-sm text-rose-300">{socket.error}</p> : null}
    </div>
  );
}
