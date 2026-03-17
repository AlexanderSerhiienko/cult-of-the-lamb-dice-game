import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/require-session", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/server/ranked/service", () => ({
  getRankedProfile: vi.fn(),
}));

import { DELETE, POST } from "@/app/api/ranked/queue/route";
import * as requireSession from "@/server/auth/require-session";
import * as rankedService from "@/server/ranked/service";

describe("ranked queue route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_REALTIME_URL = "http://localhost:4001";
    process.env.REALTIME_INTERNAL_SECRET = "test-secret";
  });

  it("rejects unauthenticated queue joins", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
  });

  it("joins the realtime ranked queue with the user's mmr", async () => {
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
      wins: 10,
      losses: 7,
      draws: 1,
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          searching: false,
          roomId: "ranked-room-1",
          matchId: "ranked-match-1",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      searching: false,
      roomId: "ranked-room-1",
      matchId: "ranked-match-1",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4001/ranked/queue",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-realtime-internal-secret": "test-secret",
        }),
        body: JSON.stringify({
          userId: "user-1",
          mmr: 420,
        }),
      }),
    );
  });

  it("leaves the realtime ranked queue", async () => {
    vi.mocked(requireSession.requireSessionUser).mockResolvedValue({
      id: "user-1",
      role: "USER",
      name: "Alex",
      email: "alex@example.com",
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ searching: false });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4001/ranked/queue",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({
          userId: "user-1",
        }),
      }),
    );
  });
});
