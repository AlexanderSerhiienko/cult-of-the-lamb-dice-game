"use client";

import type { ReactNode } from "react";
import type { OnlineUiStatus } from "@/features/online/types";

type OnlineStatusBannerProps = {
  status: OnlineUiStatus;
  opponentDisconnectSecondsLeft: number | null;
  error: string | null;
};

function Banner(props: { tone: "neutral" | "amber" | "rose" | "emerald"; children: ReactNode }) {
  const toneClass =
    props.tone === "amber"
      ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
      : props.tone === "rose"
        ? "border-rose-500/50 bg-rose-500/10 text-rose-200"
        : props.tone === "emerald"
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
          : "border-sky-500/50 bg-sky-500/10 text-sky-200";

  return <div className={`mb-3 rounded-md border px-3 py-2 text-sm ${toneClass}`}>{props.children}</div>;
}

export function OnlineStatusBanner({
  status,
  opponentDisconnectSecondsLeft,
  error,
}: OnlineStatusBannerProps) {
  if (status === "opponent_left") {
    return <Banner tone="emerald">Opponent left the match. You win immediately.</Banner>;
  }

  if (status === "sync_error") {
    return <Banner tone="rose">{error ?? "Game state sync failed. Please try again."}</Banner>;
  }

  if (status === "service_unavailable") {
    return <Banner tone="rose">{error ?? "Realtime service is unavailable. Reconnecting..."}</Banner>;
  }

  if (status === "opponent_disconnected") {
    return (
      <Banner tone="amber">
        Opponent disconnected. Waiting for reconnect: {opponentDisconnectSecondsLeft ?? 0}s. After timeout, win is
        granted automatically.
      </Banner>
    );
  }

  if (status === "move_pending") {
    return <Banner tone="neutral">Submitting move to server...</Banner>;
  }

  if (status === "loading" || status === "connecting") {
    return <Banner tone="neutral">Connecting to realtime service...</Banner>;
  }

  if (status === "reconnecting") {
    return <Banner tone="amber">Connection interrupted. Retrying...</Banner>;
  }

  return null;
}
