"use client";

import { useSession } from "next-auth/react";
import { MenuActionButton } from "@/components/home/menu-action-button";
import { ActiveMatchAction } from "@/components/home/active-match-action";
import { MenuCard } from "@/components/home/menu-card";

export default function Home() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <MenuCard
      title="Knucklebones"
      description="Browser-based dice duel inspired by Cult of the Lamb. Choose a mode and start playing."
    >
      <MenuActionButton href="/game/bot">Play vs Bot</MenuActionButton>
      <MenuActionButton href="/game/local">Local PvP</MenuActionButton>
      <MenuActionButton href="/online" disabled={!isAuthenticated}>
        {isAuthenticated ? "Private PvP" : "Private PvP (sign in required)"}
      </MenuActionButton>
      <ActiveMatchAction />
      <MenuActionButton href="/leaderboard">Leaderboard</MenuActionButton>
      <MenuActionButton href="/ranked" disabled={!isAuthenticated}>
        {isAuthenticated ? "Ranked" : "Ranked (sign in required)"}
      </MenuActionButton>
      <MenuActionButton href="/settings">Settings</MenuActionButton>
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">How to play</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-300">
          <li>1. A die rolls automatically at the start of your turn.</li>
          <li>2. Place it into any open column on your board.</li>
          <li>3. Matching values destroy your opponent&apos;s dice in that same column.</li>
          <li>4. Duplicates on one column multiply that column&apos;s score.</li>
          <li>5. The match ends when one board is completely filled.</li>
        </ol>
      </section>
    </MenuCard>
  );
}
