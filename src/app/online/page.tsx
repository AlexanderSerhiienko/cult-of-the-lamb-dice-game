"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { PagePanel } from "@/components/layout/page-panel";
import { ActionButton } from "@/components/ui/action-button";
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
      <PagePanel
        maxWidthClassName="max-w-xl"
        panelClassName="rounded-xl border border-slate-800 bg-slate-900/60 p-6 pt-14 sm:pt-16"
        backHref="/"
        backInsetClassName="left-4 top-4 sm:left-6 sm:top-6"
      >
          <h1 className="text-xl font-semibold text-slate-100">Online private rooms</h1>
          <p className="mt-3 text-sm text-slate-400">Sign in first to create or join online rooms.</p>
      </PagePanel>
    );
  }

  return (
    <PagePanel
      maxWidthClassName="max-w-xl"
      panelClassName="rounded-xl border border-slate-800 bg-slate-900/60 p-6 pt-14 sm:pt-16"
      backHref="/"
      backInsetClassName="left-4 top-4 sm:left-6 sm:top-6"
    >
        <h1 className="text-xl font-semibold text-slate-100">Online private rooms</h1>
        <p className="mt-2 text-sm text-slate-400">Create a room and share code with a friend.</p>

        <div className="mt-5 flex flex-col gap-3">
          <ActionButton
            onClick={handleCreate}
            disabled={loading}
            variant="accent"
          >
            Create room
          </ActionButton>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
              maxLength={6}
            />
            <ActionButton
              onClick={handleJoin}
              disabled={loading || joinCode.length !== 6}
              variant="neutral"
            >
              Join
            </ActionButton>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </PagePanel>
  );
}
