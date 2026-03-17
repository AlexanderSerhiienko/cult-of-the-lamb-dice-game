export const RANK_TIER = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  DIAMOND: "Diamond",
  MASTER: "Master",
} as const;

export type RankTier = (typeof RANK_TIER)[keyof typeof RANK_TIER];

export const RANK_TIERS: Array<{
  rank: RankTier;
  minMmr: number;
  maxMmr: number | null;
}> = [
  { rank: RANK_TIER.BRONZE, minMmr: 0, maxMmr: 299 },
  { rank: RANK_TIER.SILVER, minMmr: 300, maxMmr: 599 },
  { rank: RANK_TIER.GOLD, minMmr: 600, maxMmr: 899 },
  { rank: RANK_TIER.PLATINUM, minMmr: 900, maxMmr: 1199 },
  { rank: RANK_TIER.DIAMOND, minMmr: 1200, maxMmr: 1499 },
  { rank: RANK_TIER.MASTER, minMmr: 1500, maxMmr: null },
];

export const RANKED_MATCH_OUTCOME = {
  WIN: "win",
  LOSE: "lose",
  DRAW: "draw",
} as const;

export type RankedMatchOutcome =
  (typeof RANKED_MATCH_OUTCOME)[keyof typeof RANKED_MATCH_OUTCOME];

export const RANKED_MATCH_END_REASON = {
  NORMAL: "normal",
  TIMEOUT: "timeout",
  DISCONNECT: "disconnect",
  LEAVE: "leave",
  DRAW: "draw",
} as const;

export type RankedMatchEndReason =
  (typeof RANKED_MATCH_END_REASON)[keyof typeof RANKED_MATCH_END_REASON];

export type RankedProfile = {
  userId: string;
  mmr: number;
  rank: RankTier;
  progressPct: number;
  rankFloorMmr: number;
  nextRankMmr: number | null;
  wins: number;
  losses: number;
  draws: number;
};

export type RankedQueueState = {
  searching: boolean;
  joinedAt: number | null;
  mmr: number | null;
};

export type RankedMatchResultSummary = {
  matchId: string;
  roomId: string;
  rank: RankTier;
  mmrBefore: number;
  mmrAfter: number;
  mmrDelta: number;
};
