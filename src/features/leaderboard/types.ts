export type LeaderboardEntry = {
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

export type LeaderboardResponse = {
  mode: "bot" | "online" | "local";
  entries: LeaderboardEntry[];
};
