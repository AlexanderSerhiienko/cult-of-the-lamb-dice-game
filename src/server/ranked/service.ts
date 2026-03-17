import { MatchServiceError } from "@/server/matches/service";
import { getRankFromMmr, getRankProgress } from "@/server/ranked/rating";
import {
  createRankedRoomAndMatch,
  findActiveRankedMatchForUser,
  findRankedMatchResultForUser,
  findRankedMatchSessionForUser,
  findRankedProfileByUserId,
  persistRankedMatchResult,
} from "@/server/ranked/repository";
import type { RankedProfile, RankedMatchResultSummary } from "@/server/ranked/types";

export async function getRankedProfile(params: { userId: string }): Promise<RankedProfile> {
  const { userId } = params;

  if (!userId) {
    throw new MatchServiceError("Unauthorized", 401);
  }

  const profile = await findRankedProfileByUserId(userId);
  if (!profile) {
    throw new MatchServiceError("User not found", 404);
  }

  const rank = getRankFromMmr(profile.rankedMmr);
  const progress = getRankProgress(profile.rankedMmr);

  return {
    userId: profile.id,
    mmr: profile.rankedMmr,
    rank,
    progressPct: progress.progressPct,
    rankFloorMmr: progress.currentFloor,
    nextRankMmr: progress.nextThreshold,
    wins: profile.rankedWins,
    losses: profile.rankedLosses,
    draws: profile.rankedDraws,
  };
}

export async function createRankedMatch(params: {
  seat1UserId: string;
  seat2UserId: string;
}) {
  const { seat1UserId, seat2UserId } = params;

  if (!seat1UserId || !seat2UserId) {
    throw new MatchServiceError("Both players are required", 400);
  }

  if (seat1UserId === seat2UserId) {
    throw new MatchServiceError("Cannot create ranked match with the same player twice", 400);
  }

  return createRankedRoomAndMatch({ seat1UserId, seat2UserId });
}

export async function getActiveRankedMatch(params: { userId: string }) {
  const { userId } = params;

  if (!userId) {
    throw new MatchServiceError("Unauthorized", 401);
  }

  return findActiveRankedMatchForUser(userId);
}

export async function getRankedMatchSession(params: { userId: string; matchId: string }) {
  const { userId, matchId } = params;

  if (!userId) {
    throw new MatchServiceError("Unauthorized", 401);
  }

  if (!matchId) {
    throw new MatchServiceError("Match not found", 404);
  }

  const session = await findRankedMatchSessionForUser({ userId, matchId });
  if (!session) {
    throw new MatchServiceError("Ranked match not found", 404);
  }

  return session;
}

export async function finalizeRankedMatch(params: {
  matchId: string;
  winner: "seat1" | "seat2" | "draw" | null;
  endedBy?: "NORMAL" | "TIMEOUT" | "DISCONNECT" | "LEAVE" | "DRAW";
}) {
  if (!params.matchId) {
    throw new MatchServiceError("Match not found", 404);
  }

  await persistRankedMatchResult({
    matchId: params.matchId,
    winner: params.winner,
    endedBy: params.endedBy,
  });
}

export async function getRankedMatchResult(params: {
  userId: string;
  matchId: string;
}): Promise<RankedMatchResultSummary> {
  const { userId, matchId } = params;

  if (!userId) {
    throw new MatchServiceError("Unauthorized", 401);
  }

  if (!matchId) {
    throw new MatchServiceError("Ranked match not found", 404);
  }

  const result = await findRankedMatchResultForUser({ userId, matchId });
  if (!result) {
    throw new MatchServiceError("Ranked result not found", 404);
  }

  return result;
}
