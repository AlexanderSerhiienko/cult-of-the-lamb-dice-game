import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/leaderboard/service", () => ({
  getLeaderboard: vi.fn(),
}));

import { GET } from "@/app/api/leaderboard/route";
import { MatchServiceError } from "@/server/matches/service";
import * as leaderboardService from "@/server/leaderboard/service";

describe("leaderboard route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns entries for a valid request", async () => {
    vi.mocked(leaderboardService.getLeaderboard).mockResolvedValue([
      { userId: "user-1", name: "Alex", wins: 2, losses: 1, draws: 0, points: 6 },
    ] as never);

    const response = await GET(new Request("http://localhost/api/leaderboard?mode=bot&limit=10"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      mode: "bot",
      entries: [{ userId: "user-1", name: "Alex", wins: 2, losses: 1, draws: 0, points: 6 }],
    });
  });

  it("maps service errors to response status", async () => {
    vi.mocked(leaderboardService.getLeaderboard).mockRejectedValue(new MatchServiceError("boom", 400));

    const response = await GET(new Request("http://localhost/api/leaderboard?mode=local&limit=10"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "boom" });
  });
});
