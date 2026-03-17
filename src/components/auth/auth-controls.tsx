"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { ActionButton } from "@/components/ui/action-button";

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
      <ActionButton
        onClick={() => signIn("google")}
        variant="authPrimary"
        size="sm"
        shape="full"
      >
        Sign in with Google
      </ActionButton>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2 py-1">
      <span className="max-w-[12rem] truncate px-1 text-xs text-slate-300">
        {session.user.name ?? session.user.email}
      </span>
      <ActionButton
        onClick={() => signOut()}
        variant="authSecondary"
        size="sm"
        shape="full"
      >
        Sign out
      </ActionButton>
    </div>
  );
}
