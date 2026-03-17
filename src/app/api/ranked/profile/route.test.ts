import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/require-session", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/server/ranked/service", () => ({
  getRankedProfile: vi.fn(),
}));

import { GET } from "@/app/api/ranked/profile/route";
import { MatchServiceError } from "@/server/matches/service";
import * as requireSession from "@/server/auth/require-session";
import * as rankedService from "@/server/ranked/service";

describe("GET /api/ranked/profile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns the ranked profile for the current user", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue({
      id: "user-1",
      role: "USER",
      name: "Alex",
      email: "alex@example.com",
    });
    vi.mocked(rankedService.getRankedProfile).mockResolvedValue({
      userId: "user-1",
      mmr: 420,
      rank: "Silver",
      progressPct: 40,
      rankFloorMmr: 300,
      nextRankMmr: 600,
      wins: 12,
      losses: 7,
      draws: 1,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.rank).toBe("Silver");
    expect(body.profile.mmr).toBe(420);
  });

  it("maps ranked service errors", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue({
      id: "user-1",
      role: "USER",
      name: "Alex",
      email: "alex@example.com",
    });
    vi.mocked(rankedService.getRankedProfile).mockRejectedValue(new MatchServiceError("User not found", 404));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });
});
