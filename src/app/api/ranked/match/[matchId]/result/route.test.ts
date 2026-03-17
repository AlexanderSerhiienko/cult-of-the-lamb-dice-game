import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/require-session", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/server/ranked/service", () => ({
  getRankedMatchResult: vi.fn(),
}));

import { GET } from "@/app/api/ranked/match/[matchId]/result/route";
import { MatchServiceError } from "@/server/matches/service";
import * as requireSession from "@/server/auth/require-session";
import * as rankedService from "@/server/ranked/service";

describe("GET /api/ranked/match/[matchId]/result", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ matchId: "match-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns the ranked result summary", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue({
      id: "user-1",
      role: "USER",
      name: "Alex",
      email: "alex@example.com",
    });
    vi.mocked(rankedService.getRankedMatchResult).mockResolvedValue({
      matchId: "match-1",
      roomId: "room-1",
      rank: "Silver",
      mmrBefore: 420,
      mmrAfter: 436,
      mmrDelta: 16,
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ matchId: "match-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.mmrDelta).toBe(16);
  });

  it("maps ranked service errors", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue({
      id: "user-1",
      role: "USER",
      name: "Alex",
      email: "alex@example.com",
    });
    vi.mocked(rankedService.getRankedMatchResult).mockRejectedValue(
      new MatchServiceError("Ranked result not found", 404),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ matchId: "match-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Ranked result not found");
  });
});
