"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { GAME_MODE, GAME_PHASE, GAME_RESULT, PLAYER } from "@/features/game/core/types";
import { MATCH_REPORT_STATUS } from "@/features/game/store/types/game-store";
import { useGameStore } from "@/features/game/store/use-game-store";

function mapWinnerToOutcome(winner: ReturnType<typeof useGameStore.getState>["winner"]) {
  if (winner === PLAYER.PLAYER) {
    return "win";
  }

  if (winner === PLAYER.BOT) {
    return "lose";
  }

  if (winner === GAME_RESULT.DRAW) {
    return "draw";
  }

  return null;
}

export function useMatchReportEffect() {
  const { status: authStatus } = useSession();
  const phase = useGameStore((state) => state.phase);
  const gameMode = useGameStore((state) => state.gameMode);
  const matchId = useGameStore((state) => state.matchId);
  const reportStatus = useGameStore((state) => state.reportStatus);
  const winner = useGameStore((state) => state.winner);
  const seatScores = useGameStore((state) => state.seatScores);
  const setReportStatus = useGameStore((state) => state.setReportStatus);

  useEffect(() => {
    if (phase !== GAME_PHASE.FINISHED || gameMode !== GAME_MODE.PVB || reportStatus !== MATCH_REPORT_STATUS.PENDING) {
      return;
    }

    if (authStatus === "loading") {
      return;
    }

    if (authStatus !== "authenticated") {
      setReportStatus(MATCH_REPORT_STATUS.IDLE);
      return;
    }

    if (!matchId) {
      setReportStatus(MATCH_REPORT_STATUS.FAILED, { reportError: "Missing match id" });
      return;
    }

    const outcome = mapWinnerToOutcome(winner);
    if (!outcome) {
      setReportStatus(MATCH_REPORT_STATUS.FAILED, { reportError: "Missing match outcome" });
      return;
    }

    setReportStatus(MATCH_REPORT_STATUS.SENDING);

    void fetch("/api/matches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        externalMatchId: matchId,
        mode: "bot",
        outcome,
        playerScore: seatScores.seat1,
        opponentScore: seatScores.seat2,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Failed to report match");
        }

        setReportStatus(MATCH_REPORT_STATUS.SENT, { reportedAt: Date.now() });
      })
      .catch((error: unknown) => {
        setReportStatus(MATCH_REPORT_STATUS.FAILED, {
          reportError: error instanceof Error ? error.message : "Failed to report match",
        });
      });
  }, [authStatus, gameMode, matchId, phase, reportStatus, seatScores.seat1, seatScores.seat2, setReportStatus, winner]);
}
