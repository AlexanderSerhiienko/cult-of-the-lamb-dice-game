import {
  RANK_TIERS,
  RANKED_MATCH_OUTCOME,
  type RankTier,
  type RankedMatchOutcome,
} from "@/server/ranked/types";

const ELO_K = 24;

export function getRankFromMmr(mmr: number): RankTier {
  const normalizedMmr = Math.max(0, mmr);
  const tier = RANK_TIERS.find((candidate) => {
    if (candidate.maxMmr === null) {
      return normalizedMmr >= candidate.minMmr;
    }

    return normalizedMmr >= candidate.minMmr && normalizedMmr <= candidate.maxMmr;
  });

  return tier ? tier.rank : RANK_TIERS[0].rank;
}

export function getRankProgress(mmr: number) {
  const normalizedMmr = Math.max(0, mmr);
  const tier =
    RANK_TIERS.find((candidate) => {
      if (candidate.maxMmr === null) {
        return normalizedMmr >= candidate.minMmr;
      }

      return normalizedMmr >= candidate.minMmr && normalizedMmr <= candidate.maxMmr;
    }) ?? RANK_TIERS[0];

  if (tier.maxMmr === null) {
    return {
      currentRank: tier.rank,
      progressPct: 100,
      currentFloor: tier.minMmr,
      nextThreshold: null,
    };
  }

  const span = Math.max(1, tier.maxMmr - tier.minMmr + 1);
  const progressPct = Math.min(100, Math.max(0, ((normalizedMmr - tier.minMmr) / span) * 100));

  return {
    currentRank: tier.rank,
    progressPct,
    currentFloor: tier.minMmr,
    nextThreshold: tier.maxMmr + 1,
  };
}

function getExpectedScore(playerMmr: number, opponentMmr: number) {
  return 1 / (1 + 10 ** ((opponentMmr - playerMmr) / 400));
}

function getOutcomeScore(outcome: RankedMatchOutcome) {
  if (outcome === RANKED_MATCH_OUTCOME.WIN) {
    return 1;
  }

  if (outcome === RANKED_MATCH_OUTCOME.DRAW) {
    return 0.5;
  }

  return 0;
}

export function calculateRankedMmrDelta(params: {
  playerMmr: number;
  opponentMmr: number;
  outcome: RankedMatchOutcome;
}) {
  const expectedScore = getExpectedScore(params.playerMmr, params.opponentMmr);
  const actualScore = getOutcomeScore(params.outcome);
  return Math.round(ELO_K * (actualScore - expectedScore));
}
