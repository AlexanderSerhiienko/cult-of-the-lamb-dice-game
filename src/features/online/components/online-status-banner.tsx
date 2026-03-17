"use client";

import type { ReactNode } from "react";
import { ONLINE_UI_STATUS, type OnlineUiStatus } from "@/features/online/types";

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
    case ONLINE_UI_STATUS.OPPONENT_LEFT:
      return "emerald";
    case ONLINE_UI_STATUS.OPPONENT_DISCONNECTED:
    case ONLINE_UI_STATUS.RECONNECTING:
      return "amber";
    case ONLINE_UI_STATUS.SYNC_ERROR:
    case ONLINE_UI_STATUS.SERVICE_UNAVAILABLE:
      return "rose";
    default:
      return "neutral";
  }
}

function getBannerMessage(params: OnlineStatusBannerProps): ReactNode | null {
  const { status, error, opponentDisconnectSecondsLeft } = params;

  switch (status) {
    case ONLINE_UI_STATUS.OPPONENT_LEFT:
      return "Opponent left the match. You win immediately.";
    case ONLINE_UI_STATUS.SYNC_ERROR:
      return error ?? "Game state sync failed. Please try again.";
    case ONLINE_UI_STATUS.SERVICE_UNAVAILABLE:
      return error ?? "Realtime service is unavailable. Reconnecting...";
    case ONLINE_UI_STATUS.OPPONENT_DISCONNECTED:
      return (
        <>
          Opponent disconnected. Waiting for reconnect: {opponentDisconnectSecondsLeft ?? 0}s. After timeout, win is
          granted automatically.
        </>
      );
    case ONLINE_UI_STATUS.LOADING:
    case ONLINE_UI_STATUS.CONNECTING:
      return "Connecting to realtime service...";
    case ONLINE_UI_STATUS.RECONNECTING:
      return "Connection interrupted. Retrying...";
    default:
      return null;
  }
}

function Banner(props: { tone: "neutral" | "amber" | "rose" | "emerald"; children: ReactNode }) {
  return (
    <div
      className={`w-full max-w-2xl rounded-md border px-3 py-2 text-sm shadow-lg shadow-slate-950/40 ${BANNER_TONE_CLASS[props.tone]}`}
    >
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
