import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/require-session", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/server/ranked/service", () => ({
  getRankedMatchSession: vi.fn(),
}));

import { GET } from "@/app/api/ranked/match/[matchId]/route";
import { MatchServiceError } from "@/server/matches/service";
import * as requireSession from "@/server/auth/require-session";
import * as rankedService from "@/server/ranked/service";

describe("GET /api/ranked/match/[matchId]", () => {
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

  it("returns the ranked match session for the current user", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue({
      id: "user-1",
      role: "USER",
      name: "Alex",
      email: "alex@example.com",
    });
    vi.mocked(rankedService.getRankedMatchSession).mockResolvedValue({
      roomId: "ranked-room-1",
      matchId: "match-1",
      reconnectDeadlineMs: 12345,
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ matchId: "match-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      session: {
        roomId: "ranked-room-1",
        matchId: "match-1",
        reconnectDeadlineMs: 12345,
      },
    });
  });

  it("maps ranked service errors", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue({
      id: "user-1",
      role: "USER",
      name: "Alex",
      email: "alex@example.com",
    });
    vi.mocked(rankedService.getRankedMatchSession).mockRejectedValue(
      new MatchServiceError("Ranked match not found", 404),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ matchId: "match-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Ranked match not found");
  });
});
