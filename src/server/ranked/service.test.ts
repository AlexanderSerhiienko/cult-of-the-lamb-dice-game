import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/ranked/repository", () => ({
  findRankedProfileByUserId: vi.fn(),
  findRankedMatchResultForUser: vi.fn(),
  persistRankedMatchResult: vi.fn(),
}));

import { MatchServiceError } from "@/server/matches/service";
import { finalizeRankedMatch, getRankedMatchResult, getRankedProfile } from "@/server/ranked/service";
import { RANK_TIER } from "@/server/ranked/types";
import * as rankedRepository from "@/server/ranked/repository";

describe("ranked service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a derived ranked profile", async () => {
    vi.mocked(rankedRepository.findRankedProfileByUserId).mockResolvedValue({
      id: "user-1",
      rankedMmr: 420,
      rankedWins: 12,
      rankedLosses: 7,
      rankedDraws: 1,
    });

    const profile = await getRankedProfile({ userId: "user-1" });

    expect(profile).toMatchObject({
      userId: "user-1",
      mmr: 420,
      rank: RANK_TIER.SILVER,
      rankFloorMmr: 300,
      nextRankMmr: 600,
      wins: 12,
      losses: 7,
      draws: 1,
    });
    expect(profile.progressPct).toBeGreaterThan(0);
  });

  it("rejects missing user ids", async () => {
    await expect(getRankedProfile({ userId: "" })).rejects.toBeInstanceOf(MatchServiceError);
  });

  it("rejects unknown users", async () => {
    vi.mocked(rankedRepository.findRankedProfileByUserId).mockResolvedValue(null);

    await expect(getRankedProfile({ userId: "missing" })).rejects.toBeInstanceOf(MatchServiceError);
  });

  it("returns a ranked result summary for the player", async () => {
    vi.mocked(rankedRepository.findRankedMatchResultForUser).mockResolvedValue({
      matchId: "match-1",
      roomId: "room-1",
      rank: RANK_TIER.SILVER,
      mmrBefore: 420,
      mmrAfter: 436,
      mmrDelta: 16,
    });

    await expect(getRankedMatchResult({ userId: "user-1", matchId: "match-1" })).resolves.toEqual({
      matchId: "match-1",
      roomId: "room-1",
      rank: RANK_TIER.SILVER,
      mmrBefore: 420,
      mmrAfter: 436,
      mmrDelta: 16,
    });
  });

  it("persists ranked match completion", async () => {
    await finalizeRankedMatch({
      matchId: "match-1",
      winner: "seat1",
      endedBy: "NORMAL",
    });

    expect(rankedRepository.persistRankedMatchResult).toHaveBeenCalledWith({
      matchId: "match-1",
      winner: "seat1",
      endedBy: "NORMAL",
    });
  });
});
