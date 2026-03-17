"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { ActionButton } from "@/components/ui/action-button";
import { fetchRankedProfile, type RankedProfileApi } from "@/features/ranked/api";

type HeaderAccountPanelProps = {
  showRankedSegment: boolean;
};

export function HeaderAccountPanel({ showRankedSegment }: HeaderAccountPanelProps) {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<RankedProfileApi | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !showRankedSegment) {
      return;
    }

    let disposed = false;

    void fetchRankedProfile()
      .then((nextProfile) => {
        if (!disposed) {
          setProfile(nextProfile);
        }
      })
      .catch(() => {
        if (!disposed) {
          setProfile(null);
        }
      });

    return () => {
      disposed = true;
    };
  }, [showRankedSegment, status]);

  if (status === "loading") {
    return (
      <div className="flex items-center rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400">
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

  const showCompactRanked = showRankedSegment && profile;

  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2 py-1">
      {showCompactRanked ? (
        <>
          <Link
            href="/ranked"
            className="group flex min-w-0 items-center gap-2 rounded-full px-2 py-1 transition hover:bg-slate-800/80"
            aria-label={`Ranked profile: ${profile.rank}`}
          >
            <span className="text-xs font-semibold text-slate-100">{profile.rank}</span>
            <div className="h-1 w-14 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width]"
                style={{ width: `${profile.progressPct}%` }}
              />
            </div>
          </Link>
          <span className="h-5 w-px bg-slate-800" aria-hidden />
        </>
      ) : null}

      <span className="max-w-[10rem] truncate px-1 text-xs text-slate-300">
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
