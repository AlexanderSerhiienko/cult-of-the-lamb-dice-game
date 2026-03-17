"use client";

import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RankedMatchPage from "@/app/ranked/match/[matchId]/page";
import { ONLINE_UI_STATUS } from "@/features/online/types";
import { renderWithProviders } from "@/test/render";

const mockFetchRankedMatchSession = vi.fn();
const mockFetchRankedMatchResult = vi.fn();
const mockFetchRankedProfile = vi.fn();
const mockUseOnlineRoomSocket = vi.fn();

vi.mock("@/features/ranked/api", () => ({
  fetchRankedMatchSession: (matchId: string) => mockFetchRankedMatchSession(matchId),
  fetchRankedMatchResult: (matchId: string) => mockFetchRankedMatchResult(matchId),
  fetchRankedProfile: () => mockFetchRankedProfile(),
}));

vi.mock("@/features/online/hooks/use-online-room-socket", () => ({
  useOnlineRoomSocket: (...args: unknown[]) => mockUseOnlineRoomSocket(...args),
}));

describe("RankedMatchPage", () => {
  it("shows auth gating when the user is not signed in", () => {
    renderWithProviders(<RankedMatchPage />, {
      pathname: "/ranked/match/match-1",
      params: { matchId: "match-1" },
      session: { status: "unauthenticated", data: null },
    });

    expect(screen.getByText("Sign in first to access ranked matches.")).toBeInTheDocument();
  });

  it("loads the ranked match session before rendering the board", async () => {
    mockFetchRankedMatchSession.mockResolvedValue({
      roomId: "ranked-room-1",
      matchId: "match-1",
      reconnectDeadlineMs: null,
    });
    mockUseOnlineRoomSocket.mockReturnValue({
      status: ONLINE_UI_STATUS.CONNECTING,
      error: null,
      opponentDisconnectDeadlineMs: null,
      turnDeadlineMs: null,
      timeoutNotice: null,
      matchEndedBy: null,
      sendMove: vi.fn(),
    });

    renderWithProviders(<RankedMatchPage />, {
      pathname: "/ranked/match/match-1",
      params: { matchId: "match-1" },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
      storeOptions: {
        initialState: {
          onlineMySeat: null,
        },
      },
    });

    expect(screen.getByText("Loading ranked match...")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockFetchRankedMatchSession).toHaveBeenCalledWith("match-1");
    });
    expect(await screen.findByText("Connecting to realtime service...")).toBeInTheDocument();
  });

  it("renders ranked match load errors", async () => {
    mockFetchRankedMatchSession.mockRejectedValue(new Error("Ranked match not found"));
    mockUseOnlineRoomSocket.mockReturnValue({
      status: ONLINE_UI_STATUS.LOADING,
      error: null,
      opponentDisconnectDeadlineMs: null,
      turnDeadlineMs: null,
      timeoutNotice: null,
      matchEndedBy: null,
      sendMove: vi.fn(),
    });

    renderWithProviders(<RankedMatchPage />, {
      pathname: "/ranked/match/match-1",
      params: { matchId: "match-1" },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByText("Ranked match not found")).toBeInTheDocument();
  });

  it("shows the ranked turn countdown and post-match summary", async () => {
    mockFetchRankedMatchSession.mockResolvedValue({
      roomId: "ranked-room-1",
      matchId: "match-1",
      reconnectDeadlineMs: null,
    });
    mockFetchRankedMatchResult.mockResolvedValue({
      matchId: "match-1",
      roomId: "ranked-room-1",
      rank: "Silver",
      mmrBefore: 420,
      mmrAfter: 436,
      mmrDelta: 16,
    });
    mockFetchRankedProfile.mockResolvedValue({
      userId: "u1",
      mmr: 436,
      rank: "Silver",
      progressPct: 45,
      rankFloorMmr: 300,
      nextRankMmr: 600,
      wins: 11,
      losses: 7,
      draws: 1,
    });
    mockUseOnlineRoomSocket.mockReturnValue({
      status: ONLINE_UI_STATUS.CONNECTED,
      error: null,
      opponentDisconnectDeadlineMs: null,
      turnDeadlineMs: null,
      timeoutNotice: null,
      matchEndedBy: "NORMAL",
      sendMove: vi.fn(),
    });

    renderWithProviders(<RankedMatchPage />, {
      pathname: "/ranked/match/match-1",
      params: { matchId: "match-1" },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
      storeOptions: {
        initialState: {
          onlineMySeat: 1,
          onlineTurnUserId: "u1",
          phase: "finished",
          winner: "player",
        },
      },
    });

    expect(await screen.findByText("+16 MMR")).toBeInTheDocument();
    expect(screen.getByText("420 → 436 • Silver")).toBeInTheDocument();
  });
});
