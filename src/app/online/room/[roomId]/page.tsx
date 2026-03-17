"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchRoom, leaveRoom, startMatch, type RoomApiSnapshot } from "@/features/online/api";

const LOBBY_COPY_STATE = {
  IDLE: "idle",
  COPIED: "copied",
  FAILED: "failed",
} as const;

type LobbyCopyState = (typeof LOBBY_COPY_STATE)[keyof typeof LOBBY_COPY_STATE];

function formatLobbyMemberLabel(member: RoomApiSnapshot["members"][number]) {
  const memberName = member.name ?? member.email ?? member.userId;
  return member.role === "HOST" ? `${memberName} (host)` : memberName;
}

export default function OnlineRoomLobbyPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const { data: session, status } = useSession();
  const [room, setRoom] = useState<RoomApiSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [copyState, setCopyState] = useState<LobbyCopyState>(LOBBY_COPY_STATE.IDLE);
  const hasNavigatedToMatchRef = useRef(false);
  const roomId = params.roomId;

  useEffect(() => {
    if (typeof roomId !== "string" || status !== "authenticated") {
      return;
    }

    let disposed = false;
    const load = async () => {
      try {
        const snapshot = await fetchRoom(roomId);
        if (!disposed) {
          setRoom(snapshot);
        }
      } catch (loadError) {
        if (!disposed) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load room");
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 2500);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [roomId, status]);

  const userId = session?.user?.id ?? null;
  const activeMembers = useMemo(
    () => (room ? room.members.filter((member) => member.leftAt === null) : []),
    [room],
  );
  const isHost = userId !== null && room?.room.hostId === userId;
  const isMatchStarting = Boolean(room?.currentMatchId);
  const canStart = Boolean(isHost && activeMembers.length === 2 && !isStarting && !isLeaving && !isMatchStarting);
  const copyButtonLabel = copyState === LOBBY_COPY_STATE.COPIED ? "Copied" : "Copy code";
  const startButtonLabel = isStarting || isMatchStarting ? "Starting..." : "Start match";
  const leaveDisabled = isLeaving || isStarting || isMatchStarting;
  const showCopyError = copyState === LOBBY_COPY_STATE.FAILED;
  const showMatchStartingNotice = isMatchStarting;

  useEffect(() => {
    if (!room?.currentMatchId || hasNavigatedToMatchRef.current) {
      return;
    }

    hasNavigatedToMatchRef.current = true;
    router.replace(`/online/room/${room.room.id}/play?matchId=${room.currentMatchId}`);
  }, [room?.currentMatchId, room?.room.id, router]);

  async function handleStart() {
    if (!room || !canStart) {
      return;
    }
    setError(null);
    setIsStarting(true);
    try {
      const result = await startMatch(room.room.id);
      setRoom(result.room);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Failed to start match");
      setIsStarting(false);
    }
  }

  async function handleLeave() {
    if (!room || isLeaving || isMatchStarting) {
      return;
    }
    setError(null);
    setIsLeaving(true);
    try {
      await leaveRoom(room.room.id);
      router.push("/online");
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : "Failed to leave room");
      setIsLeaving(false);
    }
  }

  async function handleCopyCode() {
    if (!room) {
      return;
    }

    try {
      await navigator.clipboard.writeText(room.room.code);
      setCopyState(LOBBY_COPY_STATE.COPIED);
      window.setTimeout(() => {
        setCopyState(LOBBY_COPY_STATE.IDLE);
      }, 1500);
    } catch {
      setCopyState(LOBBY_COPY_STATE.FAILED);
    }
  }

  if (status !== "authenticated") {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm text-slate-300">Sign in first to access online rooms.</p>
      </section>
    );
  }

  if (!room) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm text-slate-300">Loading room...</p>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-100">Room {room.room.code}</h1>
        <button
          type="button"
          onClick={handleCopyCode}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:bg-slate-900"
        >
          {copyButtonLabel}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-400">Share this code to invite another player.</p>
      {showCopyError ? (
        <p className="mt-2 text-sm text-rose-300">Could not copy room code. Please copy it manually.</p>
      ) : null}
      {showMatchStartingNotice ? (
        <p className="mt-3 text-sm font-medium text-cyan-300">Match is starting. Connecting both players...</p>
      ) : null}

      <ul className="mt-5 space-y-2 text-sm text-slate-200">
        {activeMembers.map((member) => (
          <li key={member.userId} className="rounded-md border border-slate-800 px-3 py-2">
            {formatLobbyMemberLabel(member)}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className="rounded-md border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition active:scale-[0.98] active:bg-emerald-500/35 disabled:opacity-60"
        >
          {startButtonLabel}
        </button>
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaveDisabled}
          className="rounded-md border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition active:scale-[0.98] active:bg-slate-900 disabled:opacity-60"
        >
          {isLeaving ? "Leaving..." : "Leave room"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
