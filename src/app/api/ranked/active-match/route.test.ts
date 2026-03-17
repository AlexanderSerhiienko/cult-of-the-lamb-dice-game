import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/require-session", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/server/ranked/service", () => ({
  getActiveRankedMatch: vi.fn(),
}));

import { GET } from "@/app/api/ranked/active-match/route";
import { MatchServiceError } from "@/server/matches/service";
import * as requireSession from "@/server/auth/require-session";
import * as rankedService from "@/server/ranked/service";

describe("GET /api/ranked/active-match", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for unauthenticated users", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ activeMatch: null });
  });

  it("returns the current active ranked match", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue({
      id: "user-1",
      role: "USER",
      name: "Alex",
      email: "alex@example.com",
    });
    vi.mocked(rankedService.getActiveRankedMatch).mockResolvedValue({
      roomId: "ranked-room-1",
      matchId: "ranked-match-1",
      reconnectDeadlineMs: 12345,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      activeMatch: {
        roomId: "ranked-room-1",
        matchId: "ranked-match-1",
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
    vi.mocked(rankedService.getActiveRankedMatch).mockRejectedValue(
      new MatchServiceError("Unauthorized", 401),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });
});
