"use client";

import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OnlineEntryPage from "@/app/online/page";
import { renderWithProviders } from "@/test/render";

const mockCreateRoom = vi.fn();
const mockJoinRoom = vi.fn();

vi.mock("@/features/online/api", () => ({
  createRoom: () => mockCreateRoom(),
  joinRoom: (code: string) => mockJoinRoom(code),
}));

describe("OnlineEntryPage", () => {
  it("shows auth gating when the user is not signed in", () => {
    renderWithProviders(<OnlineEntryPage />, {
      pathname: "/online",
      session: { status: "unauthenticated", data: null },
    });

    expect(screen.getByText("Online private rooms")).toBeInTheDocument();
    expect(screen.getByText("Sign in first to create or join online rooms.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create room" })).not.toBeInTheDocument();
  });

  it("creates a room and navigates to its lobby", async () => {
    const push = vi.fn();
    mockCreateRoom.mockResolvedValue({
      room: { id: "room-1" },
    });

    const { user } = renderWithProviders(<OnlineEntryPage />, {
      pathname: "/online",
      router: { push },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    await user.click(screen.getByRole("button", { name: "Create room" }));

    await waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/online/room/room-1");
    });
  });

  it("normalizes the join code before joining a room", async () => {
    const push = vi.fn();
    mockJoinRoom.mockResolvedValue({
      room: { id: "room-2" },
    });

    const { user } = renderWithProviders(<OnlineEntryPage />, {
      pathname: "/online",
      router: { push },
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    await user.type(screen.getByPlaceholderText("ROOM CODE"), "ab12cd");
    await user.click(screen.getByRole("button", { name: "Join" }));

    await waitFor(() => {
      expect(mockJoinRoom).toHaveBeenCalledWith("AB12CD");
      expect(push).toHaveBeenCalledWith("/online/room/room-2");
    });
  });

  it("renders a join error message when room join fails", async () => {
    mockJoinRoom.mockRejectedValue(new Error("Room not found"));

    const { user } = renderWithProviders(<OnlineEntryPage />, {
      pathname: "/online",
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    await user.type(screen.getByPlaceholderText("ROOM CODE"), "ABC123");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(await screen.findByText("Room not found")).toBeInTheDocument();
  });
});
