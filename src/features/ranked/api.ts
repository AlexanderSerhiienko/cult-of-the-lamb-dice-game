export type RankedProfileApi = {
  userId: string;
  mmr: number;
  rank: string;
  progressPct: number;
  rankFloorMmr: number;
  nextRankMmr: number | null;
  wins: number;
  losses: number;
  draws: number;
};

export type RankedMatchSessionApi = {
  roomId: string;
  matchId: string;
  reconnectDeadlineMs: number | null;
};

export type RankedMatchResultApi = {
  matchId: string;
  roomId: string;
  rank: string;
  mmrBefore: number;
  mmrAfter: number;
  mmrDelta: number;
};

export async function fetchRankedProfile(): Promise<RankedProfileApi> {
  const response = await fetch("/api/ranked/profile", {
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | { profile?: RankedProfileApi; error?: string }
    | null;

  if (!response.ok || !data?.profile) {
    throw new Error(data?.error ?? "Failed to load ranked profile");
  }

  return data.profile;
}

export async function fetchActiveRankedMatch(): Promise<RankedMatchSessionApi | null> {
  const response = await fetch("/api/ranked/active-match", {
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | { activeMatch?: RankedMatchSessionApi | null; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to load active ranked match");
  }

  return data?.activeMatch ?? null;
}

export async function joinRankedQueue(): Promise<{
  searching: boolean;
  roomId: string | null;
  matchId: string | null;
}> {
  const response = await fetch("/api/ranked/queue", {
    method: "POST",
  });
  const data = (await response.json().catch(() => null)) as
    | { searching?: boolean; roomId?: string | null; matchId?: string | null; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to join ranked queue");
  }

  return {
    searching: Boolean(data?.searching),
    roomId: data?.roomId ?? null,
    matchId: data?.matchId ?? null,
  };
}

export async function leaveRankedQueue(): Promise<void> {
  const response = await fetch("/api/ranked/queue", {
    method: "DELETE",
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to leave ranked queue");
  }
}

export async function fetchRankedMatchSession(matchId: string): Promise<RankedMatchSessionApi> {
  const response = await fetch(`/api/ranked/match/${matchId}`, {
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | { session?: RankedMatchSessionApi; error?: string }
    | null;

  if (!response.ok || !data?.session) {
    throw new Error(data?.error ?? "Failed to load ranked match");
  }

  return data.session;
}

export async function fetchRankedMatchResult(matchId: string): Promise<RankedMatchResultApi> {
  const response = await fetch(`/api/ranked/match/${matchId}/result`, {
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | { result?: RankedMatchResultApi; error?: string }
    | null;

  if (!response.ok || !data?.result) {
    throw new Error(data?.error ?? "Failed to load ranked result");
  }

  return data.result;
}
