"use client";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OnlinePlayPage from "@/app/online/room/[roomId]/play/page";
import { renderWithProviders } from "@/test/render";

const mockUseOnlineRoomSocket = vi.fn();

vi.mock("@/features/online/hooks/use-online-room-socket", () => ({
  useOnlineRoomSocket: (...args: unknown[]) => mockUseOnlineRoomSocket(...args),
}));

describe("OnlinePlayPage", () => {
  it("renders loading state before authenticated match can run", () => {
    mockUseOnlineRoomSocket.mockReturnValue({
      status: "loading",
      error: null,
      opponentDisconnectDeadlineMs: null,
      sendMove: vi.fn(),
    });

    renderWithProviders(<OnlinePlayPage />, {
      pathname: "/online/room/room-1/play",
      params: { roomId: "room-1" },
      searchParams: { matchId: "match-1" },
      session: { status: "loading", data: null },
    });

    expect(screen.getByText("Loading online match...")).toBeInTheDocument();
  });

  it("renders banner while waiting for seat resolution", () => {
    mockUseOnlineRoomSocket.mockReturnValue({
      status: "connecting",
      error: null,
      opponentDisconnectDeadlineMs: null,
      sendMove: vi.fn(),
    });

    renderWithProviders(<OnlinePlayPage />, {
      pathname: "/online/room/room-1/play",
      params: { roomId: "room-1" },
      searchParams: { matchId: "match-1" },
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

    expect(screen.getByText("Connecting to realtime service...")).toBeInTheDocument();
  });

  it("renders reconnect countdown from socket state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T12:00:00.000Z"));
    mockUseOnlineRoomSocket.mockReturnValue({
      status: "opponent_disconnected",
      error: null,
      opponentDisconnectDeadlineMs: Date.now() + 5_000,
      sendMove: vi.fn(),
    });

    renderWithProviders(<OnlinePlayPage />, {
      pathname: "/online/room/room-1/play",
      params: { roomId: "room-1" },
      searchParams: { matchId: "match-1" },
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
        },
      },
    });

    expect(screen.getByText(/Waiting for reconnect: 5s/)).toBeInTheDocument();
  });

  it("renders service unavailable state from socket errors", () => {
    mockUseOnlineRoomSocket.mockReturnValue({
      status: "service_unavailable",
      error: "Realtime service is unavailable. Reconnecting...",
      opponentDisconnectDeadlineMs: null,
      sendMove: vi.fn(),
    });

    renderWithProviders(<OnlinePlayPage />, {
      pathname: "/online/room/room-1/play",
      params: { roomId: "room-1" },
      searchParams: { matchId: "match-1" },
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
        },
      },
    });

    expect(screen.getByText("Realtime service is unavailable. Reconnecting...")).toBeInTheDocument();
  });

  it("renders sync error state from socket errors", () => {
    mockUseOnlineRoomSocket.mockReturnValue({
      status: "sync_error",
      error: "Game state updated. Please try your move again.",
      opponentDisconnectDeadlineMs: null,
      sendMove: vi.fn(),
    });

    renderWithProviders(<OnlinePlayPage />, {
      pathname: "/online/room/room-1/play",
      params: { roomId: "room-1" },
      searchParams: { matchId: "match-1" },
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
        },
      },
    });

    expect(screen.getByText("Game state updated. Please try your move again.")).toBeInTheDocument();
  });

  it("renders opponent-left win state", () => {
    mockUseOnlineRoomSocket.mockReturnValue({
      status: "opponent_left",
      error: null,
      opponentDisconnectDeadlineMs: null,
      sendMove: vi.fn(),
    });

    renderWithProviders(<OnlinePlayPage />, {
      pathname: "/online/room/room-1/play",
      params: { roomId: "room-1" },
      searchParams: { matchId: "match-1" },
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
        },
      },
    });

    expect(screen.getByText("Opponent left the match. You win immediately.")).toBeInTheDocument();
  });

  it("blocks board interaction while a move is pending", async () => {
    const sendMove = vi.fn();
    mockUseOnlineRoomSocket.mockReturnValue({
      status: "move_pending",
      error: null,
      opponentDisconnectDeadlineMs: null,
      sendMove,
    });

    const { user } = renderWithProviders(<OnlinePlayPage />, {
      pathname: "/online/room/room-1/play",
      params: { roomId: "room-1" },
      searchParams: { matchId: "match-1" },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
      storeOptions: {
        initialState: {
          gameMode: "online_private",
          phase: "player_turn",
          status: "in_progress",
          currentRoll: 4,
          onlineMySeat: 1,
          onlineTurnUserId: "u1",
          seat1Board: [[], [], []],
          seat2Board: [[], [], []],
        },
      },
    });

    const button = screen.getByRole("button", { name: "Your board column 1" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(sendMove).not.toHaveBeenCalled();
  });

  it("allows submitting a move through the socket hook on a valid turn", async () => {
    const sendMove = vi.fn();
    mockUseOnlineRoomSocket.mockReturnValue({
      status: "connected",
      error: null,
      opponentDisconnectDeadlineMs: null,
      sendMove,
    });

    const { user } = renderWithProviders(<OnlinePlayPage />, {
      pathname: "/online/room/room-1/play",
      params: { roomId: "room-1" },
      searchParams: { matchId: "match-1" },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
      storeOptions: {
        initialState: {
          gameMode: "online_private",
          phase: "player_turn",
          status: "in_progress",
          currentRoll: 4,
          onlineMySeat: 1,
          onlineTurnUserId: "u1",
          seat1Board: [[], [], []],
          seat2Board: [[], [], []],
        },
      },
    });

    await user.click(screen.getByRole("button", { name: "Your board column 2" }));

    expect(sendMove).toHaveBeenCalledWith(1);
  });
});
