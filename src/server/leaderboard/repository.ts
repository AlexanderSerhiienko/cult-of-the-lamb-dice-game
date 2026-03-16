import { MatchMode } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { LeaderboardEntry, TrackedMatchMode } from "@/server/matches/types";

type LeaderboardRow = {
  userId: string;
  displayName: string;
  image: string | null;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  winRate: number;
};

export async function findLeaderboardSource(params: {
  mode: TrackedMatchMode;
  limit: number;
}): Promise<LeaderboardEntry[]> {
  const { mode } = params;
  const { limit } = params;
  const modeValue = mode === "bot" ? MatchMode.BOT : MatchMode.ONLINE;

  const rows = await prisma.$queryRaw<LeaderboardRow[]>`
    SELECT
      mr."userId" AS "userId",
      COALESCE(u."name", u."email", 'Anonymous') AS "displayName",
      u."image" AS "image",
      COUNT(*)::int AS "games",
      SUM(CASE WHEN mr."outcome" = 'WIN' THEN 1 ELSE 0 END)::int AS "wins",
      SUM(CASE WHEN mr."outcome" = 'LOSE' THEN 1 ELSE 0 END)::int AS "losses",
      SUM(CASE WHEN mr."outcome" = 'DRAW' THEN 1 ELSE 0 END)::int AS "draws",
      SUM(mr."playerScore")::int AS "totalScore",
      ROUND((100.0 * SUM(CASE WHEN mr."outcome" = 'WIN' THEN 1 ELSE 0 END) / COUNT(*))::numeric, 1)::float AS "winRate"
    FROM "MatchResult" mr
    JOIN "User" u ON u."id" = mr."userId"
    WHERE mr."mode" = ${modeValue}
    GROUP BY mr."userId", u."name", u."email", u."image"
    ORDER BY "wins" DESC, "winRate" DESC, "totalScore" DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    userId: row.userId,
    displayName: row.displayName,
    image: row.image,
    games: Number(row.games),
    wins: Number(row.wins),
    losses: Number(row.losses),
    draws: Number(row.draws),
    totalScore: Number(row.totalScore),
    winRate: Number(row.winRate),
  }));
}
