"use client";

import type { ReactNode } from "react";
import type { OnlineUiStatus } from "@/features/online/types";

type OnlineStatusBannerProps = {
  status: OnlineUiStatus;
  opponentDisconnectSecondsLeft: number | null;
  error: string | null;
};

const BANNER_TONE_CLASS = {
  neutral: "border-sky-500/50 bg-sky-500/10 text-sky-200",
  amber: "border-amber-500/50 bg-amber-500/10 text-amber-200",
  rose: "border-rose-500/50 bg-rose-500/10 text-rose-200",
  emerald: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
} as const;

function getBannerTone(status: OnlineUiStatus): keyof typeof BANNER_TONE_CLASS {
  switch (status) {
    case "opponent_left":
      return "emerald";
    case "opponent_disconnected":
    case "reconnecting":
      return "amber";
    case "sync_error":
    case "service_unavailable":
      return "rose";
    default:
      return "neutral";
  }
}

function getBannerMessage(params: OnlineStatusBannerProps): ReactNode | null {
  const { status, error, opponentDisconnectSecondsLeft } = params;

  switch (status) {
    case "opponent_left":
      return "Opponent left the match. You win immediately.";
    case "sync_error":
      return error ?? "Game state sync failed. Please try again.";
    case "service_unavailable":
      return error ?? "Realtime service is unavailable. Reconnecting...";
    case "opponent_disconnected":
      return (
        <>
          Opponent disconnected. Waiting for reconnect: {opponentDisconnectSecondsLeft ?? 0}s. After timeout, win is
          granted automatically.
        </>
      );
    case "move_pending":
      return "Submitting move to server...";
    case "loading":
    case "connecting":
      return "Connecting to realtime service...";
    case "reconnecting":
      return "Connection interrupted. Retrying...";
    default:
      return null;
  }
}

function Banner(props: { tone: "neutral" | "amber" | "rose" | "emerald"; children: ReactNode }) {
  return (
    <div className={`mb-3 rounded-md border px-3 py-2 text-sm ${BANNER_TONE_CLASS[props.tone]}`}>
      {props.children}
    </div>
  );
}

export function OnlineStatusBanner({
  status,
  opponentDisconnectSecondsLeft,
  error,
}: OnlineStatusBannerProps) {
  const message = getBannerMessage({ status, opponentDisconnectSecondsLeft, error });
  if (!message) {
    return null;
  }

  return <Banner tone={getBannerTone(status)}>{message}</Banner>;
}
