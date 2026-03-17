"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function AuthControls() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400">
        Auth...
      </div>
    );
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => signIn("google")}
        className="rounded-full border border-emerald-500/60 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2 py-1">
      <span className="max-w-[12rem] truncate px-1 text-xs text-slate-300">
        {session.user.name ?? session.user.email}
      </span>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
      >
        Sign out
      </button>
    </div>
  );
}
