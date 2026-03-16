"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { createRoom, joinRoom } from "@/features/online/api";

export default function OnlineEntryPage() {
  const router = useRouter();
  const { status } = useSession();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const room = await createRoom();
      router.push(`/online/room/${room.room.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setError(null);
    setLoading(true);
    try {
      const room = await joinRoom(joinCode.trim().toUpperCase());
      router.push(`/online/room/${room.room.id}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  }

  if (status !== "authenticated") {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-semibold text-slate-100">Online private rooms</h1>
        <p className="mt-3 text-sm text-slate-400">Sign in first to create or join online rooms.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h1 className="text-xl font-semibold text-slate-100">Online private rooms</h1>
      <p className="mt-2 text-sm text-slate-400">Create a room and share code with a friend.</p>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="rounded-md border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60"
        >
          Create room
        </button>

        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            maxLength={6}
          />
          <button
            type="button"
            onClick={handleJoin}
            disabled={loading || joinCode.length !== 6}
            className="rounded-md border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
          >
            Join
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
