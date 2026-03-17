"use client";

import { useParams } from "next/navigation";
import { OnlineGameContent } from "@/features/online/components/online-game-content";
import { OnlineStatusBanner } from "@/features/online/components/online-status-banner";
import { isOnlineInteractionBlocked } from "@/features/online/types";
import { useRankedMatchPage } from "@/features/ranked/hooks/use-ranked-match-page";

function formatMmrDelta(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

export default function RankedMatchPage() {
  const params = useParams<{ matchId: string }>();
  const {
    status,
    userId,
    mySeat,
    error,
    result,
    profile,
    socket,
    canRun,
    reconnectSecondsLeft,
    turnSecondsLeft,
    isMyTurn,
  } = useRankedMatchPage(params.matchId);

  const rankedTimerBadge =
    turnSecondsLeft === null ? null : (
      <div className="pointer-events-none rounded-full border border-amber-400/40 bg-slate-950/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200 shadow-lg backdrop-blur">
        {isMyTurn ? "Your turn" : "Opponent turn"} · {turnSecondsLeft}s
      </div>
    );
  const timeoutNotice =
    !socket.timeoutNotice ? null : (
      <div className="rounded-full border border-rose-400/40 bg-slate-950/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-200 shadow-lg backdrop-blur">
        {socket.timeoutNotice.userId === userId ? "Move auto-placed after timeout" : "Opponent timed out. Auto-move applied"}
        {" · "}
        {socket.timeoutNotice.strikeCount}/{socket.timeoutNotice.strikeLimit} strikes
      </div>
    );
  const resultDetails =
    result && profile ? (
      <div className="space-y-3 text-left">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Ranked result</p>
          <p className="mt-1 text-lg font-semibold text-emerald-100">{formatMmrDelta(result.mmrDelta)} MMR</p>
          <p className="mt-1 text-sm text-slate-300">
            {result.mmrBefore} → {result.mmrAfter} • {profile.rank}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Progress</p>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width]"
              style={{ width: `${profile.progressPct}%` }}
            />
          </div>
        </div>
      </div>
    ) : null;

  if (status !== "authenticated") {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm text-slate-300">Sign in first to access ranked matches.</p>
      </section>
    );
  }

  if (!canRun) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm text-slate-300">Loading ranked match...</p>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
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
      userId={userId ?? ""}
      onSelectColumn={socket.sendMove}
      interactionBlocked={isOnlineInteractionBlocked(socket.status)}
      backToHref="/ranked"
      leaveRoomOnExit={false}
      resultDetails={resultDetails}
      statusBanner={
        <div className="flex max-w-full flex-col items-center gap-2">
          {rankedTimerBadge}
          {timeoutNotice}
          <OnlineStatusBanner
            status={socket.status}
            opponentDisconnectSecondsLeft={reconnectSecondsLeft}
            error={socket.error}
          />
        </div>
      }
    />
  );
}
