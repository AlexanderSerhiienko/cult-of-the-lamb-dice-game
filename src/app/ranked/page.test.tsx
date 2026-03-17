"use client";

import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RankedPage from "@/app/ranked/page";
import { renderWithProviders } from "@/test/render";

const mockFetchRankedProfile = vi.fn();
const mockFetchActiveRankedMatch = vi.fn();
const mockJoinRankedQueue = vi.fn();
const mockLeaveRankedQueue = vi.fn();

vi.mock("@/features/ranked/api", () => ({
  fetchRankedProfile: () => mockFetchRankedProfile(),
  fetchActiveRankedMatch: () => mockFetchActiveRankedMatch(),
  joinRankedQueue: () => mockJoinRankedQueue(),
  leaveRankedQueue: () => mockLeaveRankedQueue(),
}));

describe("RankedPage", () => {
  it("shows auth gating when the user is not signed in", () => {
    renderWithProviders(<RankedPage />, {
      pathname: "/ranked",
      session: { status: "unauthenticated", data: null },
    });

    expect(screen.getByText("Ranked 1v1")).toBeInTheDocument();
    expect(screen.getByText("Sign in first to search for ranked matches.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Main menu" })).toHaveAttribute("href", "/");
  });

  it("renders the rank summary for authenticated users", async () => {
    mockFetchRankedProfile.mockResolvedValue({
      userId: "u1",
      mmr: 420,
      rank: "Silver",
      progressPct: 40,
      rankFloorMmr: 300,
      nextRankMmr: 600,
      wins: 10,
      losses: 7,
      draws: 1,
    });
    mockFetchActiveRankedMatch.mockResolvedValue(null);

    renderWithProviders(<RankedPage />, {
      pathname: "/ranked",
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByText("Silver")).toBeInTheDocument();
    expect(screen.getByText("420 / 600 MMR")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Main menu" })).toHaveAttribute("href", "/");
  });

  it("joins the queue and redirects when a match is assigned immediately", async () => {
    const push = vi.fn();
    mockFetchRankedProfile.mockResolvedValue({
      userId: "u1",
      mmr: 420,
      rank: "Silver",
      progressPct: 40,
      rankFloorMmr: 300,
      nextRankMmr: 600,
      wins: 10,
      losses: 7,
      draws: 1,
    });
    mockFetchActiveRankedMatch.mockResolvedValue(null);
    mockJoinRankedQueue.mockResolvedValue({
      searching: false,
      roomId: "ranked-room-1",
      matchId: "ranked-match-1",
    });

    const { user } = renderWithProviders(<RankedPage />, {
      pathname: "/ranked",
      router: { push },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    await screen.findByText("Silver");
    await user.click(screen.getByRole("button", { name: "Find match" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/ranked/match/ranked-match-1");
    });
  });

  it("shows cancel search instead of find match while queue search is active", async () => {
    mockFetchRankedProfile.mockResolvedValue({
      userId: "u1",
      mmr: 420,
      rank: "Silver",
      progressPct: 40,
      rankFloorMmr: 300,
      nextRankMmr: 600,
      wins: 10,
      losses: 7,
      draws: 1,
    });
    mockFetchActiveRankedMatch.mockResolvedValue(null);
    mockJoinRankedQueue.mockResolvedValue({
      searching: true,
      roomId: null,
      matchId: null,
    });

    const { user } = renderWithProviders(<RankedPage />, {
      pathname: "/ranked",
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    await screen.findByText("Silver");
    await user.click(screen.getByRole("button", { name: "Find match" }));

    expect(screen.queryByRole("button", { name: "Find match" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel search" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Main menu" })).not.toBeInTheDocument();
  });
});
