"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LeaderboardEntry, LeaderboardResponse } from "@/features/leaderboard/types";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/leaderboard?mode=bot&limit=20");
        if (!response.ok) {
          throw new Error("Failed to load leaderboard");
        }

        const data = (await response.json()) as LeaderboardResponse;

        if (!active) {
          return;
        }

        setEntries(data.entries);
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Unknown error");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40 md:p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">Leaderboard</h1>
        <p className="text-sm text-slate-300/85 md:text-base">Top players in tracked bot matches.</p>
      </div>

      {loading ? <p className="text-sm text-slate-300">Loading...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/70 text-slate-200">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Games</th>
                <th className="px-4 py-3">W/L/D</th>
                <th className="px-4 py-3">Win rate</th>
                <th className="px-4 py-3">Total score</th>
                <th className="px-4 py-3">Best score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.userId} className="border-t border-slate-800 text-slate-300">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3">{entry.displayName}</td>
                  <td className="px-4 py-3">{entry.games}</td>
                  <td className="px-4 py-3">
                    {entry.wins}/{entry.losses}/{entry.draws}
                  </td>
                  <td className="px-4 py-3">{entry.winRate}%</td>
                  <td className="px-4 py-3">{entry.totalScore}</td>
                  <td className="px-4 py-3">{entry.bestScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div>
        <Link
          href="/"
          className="inline-flex rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
        >
          Back
        </Link>
      </div>
    </section>
  );
}
