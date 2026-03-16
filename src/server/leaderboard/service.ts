import { REPORTED_MATCH_MODE, TRACKED_MATCH_MODE } from "@/server/matches/types";
import { MatchServiceError } from "@/server/matches/service";
import { findLeaderboardSource } from "@/server/leaderboard/repository";
import type { LeaderboardEntry, ReportedMatchMode, TrackedMatchMode } from "@/server/matches/types";

function toTrackedMode(mode: ReportedMatchMode): TrackedMatchMode {
  if (mode === REPORTED_MATCH_MODE.LOCAL) {
    throw new MatchServiceError("Local mode leaderboard is not supported", 400);
  }

  return mode === REPORTED_MATCH_MODE.BOT ? TRACKED_MATCH_MODE.BOT : TRACKED_MATCH_MODE.ONLINE;
}

export async function getLeaderboard(params: {
  mode: ReportedMatchMode;
  limit: number;
}): Promise<LeaderboardEntry[]> {
  const { mode, limit } = params;
  const trackedMode = toTrackedMode(mode);
  return findLeaderboardSource({ mode: trackedMode, limit });
}
