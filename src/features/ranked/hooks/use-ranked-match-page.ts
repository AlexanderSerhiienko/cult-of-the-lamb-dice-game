"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useOnlineRoomSocket } from "@/features/online/hooks/use-online-room-socket";
import {
  fetchRankedMatchResult,
  fetchRankedMatchSession,
  fetchRankedProfile,
  type RankedMatchResultApi,
  type RankedProfileApi,
} from "@/features/ranked/api";
import { useGameStore } from "@/features/game/store/use-game-store";

export function useRankedMatchPage(matchId: string | string[] | undefined) {
  const { data: session, status } = useSession();
  const mySeat = useGameStore((state) => state.onlineMySeat);
  const phase = useGameStore((state) => state.phase);
  const winner = useGameStore((state) => state.winner);
  const turnUserId = useGameStore((state) => state.onlineTurnUserId);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RankedMatchResultApi | null>(null);
  const [profile, setProfile] = useState<RankedProfileApi | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "authenticated" || typeof matchId !== "string") {
      return;
    }

    let disposed = false;

    void fetchRankedMatchSession(matchId)
      .then((rankedSession) => {
        if (!disposed) {
          setRoomId(rankedSession.roomId);
        }
      })
      .catch((loadError) => {
        if (!disposed) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load ranked match");
        }
      });

    return () => {
      disposed = true;
    };
  }, [matchId, status]);

  const userId = session?.user?.id;
  const canRun = status === "authenticated" && typeof matchId === "string" && !!roomId && !!userId;
  const socket = useOnlineRoomSocket({
    roomId: canRun ? roomId : "",
    matchId: canRun ? matchId : "",
    userId: canRun ? userId : "",
    enabled: canRun,
  }) ?? {
    status: "loading",
    error: null,
    movePending: false,
    transportState: "idle",
    sendMove: () => undefined,
    opponentDisconnected: false,
    opponentDisconnectDeadlineMs: null,
    opponentConnectionState: "connected",
    turnDeadlineMs: null,
    timeoutNotice: null,
    matchEndedBy: null,
  };

  useEffect(() => {
    const hasLiveDeadline = socket.turnDeadlineMs !== null || socket.opponentDisconnectDeadlineMs !== null;
    if (!hasLiveDeadline) {
      return;
    }

    const refreshIntervalMs = socket.turnDeadlineMs !== null ? 250 : 1000;
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [socket.opponentDisconnectDeadlineMs, socket.turnDeadlineMs]);

  useEffect(() => {
    if (phase !== "finished" || !winner || typeof matchId !== "string") {
      return;
    }

    let disposed = false;

    void Promise.all([fetchRankedMatchResult(matchId), fetchRankedProfile()])
      .then(([rankedResult, rankedProfile]) => {
        if (!disposed) {
          setResult(rankedResult);
          setProfile(rankedProfile);
        }
      })
      .catch(() => {
        if (!disposed) {
          setResult(null);
          setProfile(null);
        }
      });

    return () => {
      disposed = true;
    };
  }, [matchId, phase, winner]);

  const reconnectSecondsLeft =
    socket.opponentDisconnectDeadlineMs === null
      ? null
      : Math.max(0, Math.ceil((socket.opponentDisconnectDeadlineMs - nowMs) / 1000));
  const turnSecondsLeft =
    socket.turnDeadlineMs === null ? null : Math.max(0, Math.ceil((socket.turnDeadlineMs - nowMs) / 1000));
  const isMyTurn = Boolean(userId && turnUserId === userId);

  return {
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
  };
}
