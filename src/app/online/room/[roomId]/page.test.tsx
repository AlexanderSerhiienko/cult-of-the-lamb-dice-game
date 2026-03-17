"use client";

import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OnlineRoomLobbyPage from "@/app/online/room/[roomId]/page";
import { renderWithProviders } from "@/test/render";

const mockFetchRoom = vi.fn();
const mockLeaveRoom = vi.fn();
const mockStartMatch = vi.fn();

vi.mock("@/features/online/api", () => ({
  fetchRoom: (roomId: string) => mockFetchRoom(roomId),
  leaveRoom: (roomId: string) => mockLeaveRoom(roomId),
  startMatch: (roomId: string) => mockStartMatch(roomId),
}));

function createRoomSnapshot(overrides?: Partial<{
  hostId: string;
  currentMatchId: string | null;
  members: Array<{
    userId: string;
    role: "HOST" | "PLAYER";
    joinedAt: string;
    leftAt: string | null;
    name: string | null;
    email: string | null;
  }>;
}>) {
  return {
    room: {
      id: "room-1",
      code: "ABC123",
      status: "WAITING" as const,
      hostId: overrides?.hostId ?? "user-1",
      createdAt: "2026-03-17T00:00:00.000Z",
    },
    members:
      overrides?.members ??
      [
        {
          userId: "user-1",
          role: "HOST" as const,
          joinedAt: "2026-03-17T00:00:00.000Z",
          leftAt: null,
          name: "Alex",
          email: "alex@example.com",
        },
        {
          userId: "user-2",
          role: "PLAYER" as const,
          joinedAt: "2026-03-17T00:00:05.000Z",
          leftAt: null,
          name: "Sam",
          email: "sam@example.com",
        },
      ],
    currentMatchId: overrides?.currentMatchId ?? null,
  };
}

describe("OnlineRoomLobbyPage", () => {
  it("gates unauthenticated users", () => {
    renderWithProviders(<OnlineRoomLobbyPage />, {
      pathname: "/online/room/room-1",
      params: { roomId: "room-1" },
      session: { status: "unauthenticated", data: null },
    });

    expect(screen.getByText("Sign in first to access online rooms.")).toBeInTheDocument();
  });

  it("renders room members and enables start for the host", async () => {
    mockFetchRoom.mockResolvedValue(createRoomSnapshot());

    renderWithProviders(<OnlineRoomLobbyPage />, {
      pathname: "/online/room/room-1",
      params: { roomId: "room-1" },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "user-1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByRole("heading", { name: "Room ABC123" })).toBeInTheDocument();
    expect(screen.getByText("Alex (host)")).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start match" })).toBeEnabled();
  });

  it("keeps start disabled for a non-host player", async () => {
    mockFetchRoom.mockResolvedValue(createRoomSnapshot({ hostId: "user-2" }));

    renderWithProviders(<OnlineRoomLobbyPage />, {
      pathname: "/online/room/room-1",
      params: { roomId: "room-1" },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "user-1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByRole("heading", { name: "Room ABC123" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start match" })).toBeDisabled();
  });

  it("navigates into the play page when the room already has a current match", async () => {
    const replace = vi.fn();
    mockFetchRoom.mockResolvedValue(createRoomSnapshot({ currentMatchId: "match-1" }));

    renderWithProviders(<OnlineRoomLobbyPage />, {
      pathname: "/online/room/room-1",
      params: { roomId: "room-1" },
      router: { replace },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "user-1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/online/room/room-1/play?matchId=match-1");
    });
  });

  it("leaves the room and returns to online entry", async () => {
    const push = vi.fn();
    mockFetchRoom.mockResolvedValue(createRoomSnapshot());
    mockLeaveRoom.mockResolvedValue(createRoomSnapshot());

    const { user } = renderWithProviders(<OnlineRoomLobbyPage />, {
      pathname: "/online/room/room-1",
      params: { roomId: "room-1" },
      router: { push },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "user-1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByRole("button", { name: "Leave room" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Leave room" }));

    await waitFor(() => {
      expect(mockLeaveRoom).toHaveBeenCalledWith("room-1");
      expect(push).toHaveBeenCalledWith("/online");
    });
  });

  it("renders start errors from the API", async () => {
    mockFetchRoom.mockResolvedValue(createRoomSnapshot());
    mockStartMatch.mockRejectedValue(new Error("Cannot start yet"));

    const { user } = renderWithProviders(<OnlineRoomLobbyPage />, {
      pathname: "/online/room/room-1",
      params: { roomId: "room-1" },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "user-1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByRole("button", { name: "Start match" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Start match" }));

    expect(await screen.findByText("Cannot start yet")).toBeInTheDocument();
  });
});
