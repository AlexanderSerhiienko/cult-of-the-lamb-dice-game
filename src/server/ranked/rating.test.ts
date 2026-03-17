import { describe, expect, it } from "vitest";
import { calculateRankedMmrDelta, getRankFromMmr, getRankProgress } from "@/server/ranked/rating";
import { RANK_TIER, RANKED_MATCH_OUTCOME } from "@/server/ranked/types";

describe("ranked rating", () => {
  it("maps mmr to expected tiers", () => {
    expect(getRankFromMmr(0)).toBe(RANK_TIER.BRONZE);
    expect(getRankFromMmr(300)).toBe(RANK_TIER.SILVER);
    expect(getRankFromMmr(600)).toBe(RANK_TIER.GOLD);
    expect(getRankFromMmr(900)).toBe(RANK_TIER.PLATINUM);
    expect(getRankFromMmr(1200)).toBe(RANK_TIER.DIAMOND);
    expect(getRankFromMmr(1500)).toBe(RANK_TIER.MASTER);
  });

  it("calculates progress within a bounded tier", () => {
    const progress = getRankProgress(450);

    expect(progress.currentRank).toBe(RANK_TIER.SILVER);
    expect(progress.currentFloor).toBe(300);
    expect(progress.nextThreshold).toBe(600);
    expect(progress.progressPct).toBeGreaterThan(0);
    expect(progress.progressPct).toBeLessThan(100);
  });

  it("caps top-tier progress at 100%", () => {
    const progress = getRankProgress(1700);

    expect(progress.currentRank).toBe(RANK_TIER.MASTER);
    expect(progress.progressPct).toBe(100);
    expect(progress.nextThreshold).toBeNull();
  });

  it("rewards beating a stronger player more than a weaker one", () => {
    const strongWin = calculateRankedMmrDelta({
      playerMmr: 800,
      opponentMmr: 1000,
      outcome: RANKED_MATCH_OUTCOME.WIN,
    });
    const weakWin = calculateRankedMmrDelta({
      playerMmr: 800,
      opponentMmr: 600,
      outcome: RANKED_MATCH_OUTCOME.WIN,
    });

    expect(strongWin).toBeGreaterThan(weakWin);
  });

  it("penalizes losing to a weaker player more than losing to a stronger one", () => {
    const weakLoss = calculateRankedMmrDelta({
      playerMmr: 800,
      opponentMmr: 600,
      outcome: RANKED_MATCH_OUTCOME.LOSE,
    });
    const strongLoss = calculateRankedMmrDelta({
      playerMmr: 800,
      opponentMmr: 1000,
      outcome: RANKED_MATCH_OUTCOME.LOSE,
    });

    expect(weakLoss).toBeLessThan(strongLoss);
  });
});
