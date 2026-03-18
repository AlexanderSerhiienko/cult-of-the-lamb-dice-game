"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PagePanel } from "@/components/layout/page-panel";
import { ActionButton } from "@/components/ui/action-button";
import type { RankedProfileApi } from "@/features/ranked/api";
import { useRankedPage } from "@/features/ranked/hooks/use-ranked-page";

function formatRankProgress(profile: RankedProfileApi) {
  if (profile.nextRankMmr === null) {
    return `${profile.mmr} MMR`;
  }

  return `${profile.mmr} / ${profile.nextRankMmr} MMR`;
}

function RankedPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, profile, error, isLoading, isSearching, isCancelling, handleFindMatch, handleCancel } =
    useRankedPage();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentlySearching = params.get("searching") === "1";

    if (isSearching === currentlySearching) {
      return;
    }

    if (isSearching) {
      params.set("searching", "1");
    } else {
      params.delete("searching");
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [isSearching, pathname, router, searchParams]);

  if (status !== "authenticated") {
    return (
      <PagePanel
        maxWidthClassName="max-w-xl"
        panelClassName="rounded-xl border border-slate-800 bg-slate-900/60 p-6 pt-14 sm:pt-16"
        backHref="/"
        backInsetClassName="left-4 top-4 sm:left-6 sm:top-6"
      >
          <h1 className="text-xl font-semibold text-slate-100">Ranked 1v1</h1>
          <p className="mt-3 text-sm text-slate-400">Sign in first to search for ranked matches.</p>
      </PagePanel>
    );
  }

  if (isLoading || !profile) {
    return (
      <PagePanel
        maxWidthClassName="max-w-xl"
        panelClassName="rounded-xl border border-slate-800 bg-slate-900/60 p-6 pt-14 sm:pt-16"
        backHref={isSearching ? undefined : "/"}
        backInsetClassName="left-4 top-4 sm:left-6 sm:top-6"
      >
          <p className="text-sm text-slate-300">Loading ranked queue...</p>
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </PagePanel>
    );
  }

  return (
    <PagePanel
      maxWidthClassName="max-w-xl"
      panelClassName="rounded-xl border border-slate-800 bg-slate-900/60 p-6 pt-14 sm:pt-16"
      backHref={isSearching ? undefined : "/"}
      backInsetClassName="left-4 top-4 sm:left-6 sm:top-6"
    >
        <h1 className="text-xl font-semibold text-slate-100">Ranked 1v1</h1>
        <p className="mt-2 text-sm text-slate-400">Queue into a timed duel and climb by MMR.</p>

        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current rank</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{profile.rank}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Progress</p>
              <p className="mt-1 text-sm text-slate-200">{formatRankProgress(profile)}</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width]"
              style={{ width: `${profile.progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isSearching ? (
            <ActionButton
              onClick={handleCancel}
              disabled={isCancelling}
              variant="neutral"
            >
              {isCancelling ? "Cancelling..." : "Cancel search"}
            </ActionButton>
          ) : (
            <ActionButton
              onClick={handleFindMatch}
              variant="accent"
            >
              Find match
            </ActionButton>
          )}
        </div>

        {isSearching ? (
          <p className="mt-4 text-sm text-cyan-300">Searching for a nearby opponent...</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </PagePanel>
  );
}

export default function RankedPage() {
  return (
    <Suspense
      fallback={
        <PagePanel
          maxWidthClassName="max-w-xl"
          panelClassName="rounded-xl border border-slate-800 bg-slate-900/60 p-6 pt-14 sm:pt-16"
          backHref="/"
          backInsetClassName="left-4 top-4 sm:left-6 sm:top-6"
        >
          <p className="text-sm text-slate-300">Loading ranked queue...</p>
        </PagePanel>
      }
    >
      <RankedPageContent />
    </Suspense>
  );
}
