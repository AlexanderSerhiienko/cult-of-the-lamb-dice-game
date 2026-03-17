export const REPORTED_MATCH_MODE = {
  BOT: "bot",
  ONLINE: "online",
  LOCAL: "local",
} as const;

export type ReportedMatchMode = (typeof REPORTED_MATCH_MODE)[keyof typeof REPORTED_MATCH_MODE];

export const TRACKED_MATCH_MODE = {
  BOT: "bot",
  ONLINE: "online",
} as const;

export type TrackedMatchMode = (typeof TRACKED_MATCH_MODE)[keyof typeof TRACKED_MATCH_MODE];

export const MATCH_OUTCOME = {
  WIN: "win",
  LOSE: "lose",
  DRAW: "draw",
} as const;

export type MatchOutcome = (typeof MATCH_OUTCOME)[keyof typeof MATCH_OUTCOME];

export type CreateMatchResultRequest = {
  externalMatchId: string;
  mode: ReportedMatchMode;
  outcome: MatchOutcome;
  playerScore: number;
  opponentScore: number;
};

export type CreateTrackedMatchResultInput = Omit<CreateMatchResultRequest, "mode"> & {
  mode: TrackedMatchMode;
};

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  image: string | null;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  bestScore: number;
  winRate: number;
};
