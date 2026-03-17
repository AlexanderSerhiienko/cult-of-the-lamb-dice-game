"use client";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { renderWithProviders } from "@/test/render";

describe("Home page", () => {
  it("renders the main menu actions and how-to-play guidance", () => {
    renderWithProviders(<Home />, {
      pathname: "/",
      session: { status: "unauthenticated", data: null },
    });

    expect(screen.getByRole("link", { name: "New game with bot" })).toHaveAttribute("href", "/game/bot");
    expect(screen.getByRole("link", { name: "Local PvP" })).toHaveAttribute("href", "/game/local");
    expect(screen.getByRole("link", { name: "Online PvP" })).toHaveAttribute("href", "/online");
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute("href", "/leaderboard");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByText("How to play")).toBeInTheDocument();
    expect(screen.getByText(/A die rolls automatically at the start of your turn/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /active match/i })).not.toBeInTheDocument();
  });

  it("surfaces the active match CTA for authenticated users", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          activeMatch: {
            roomId: "room-1",
            matchId: "match-1",
            reconnectDeadlineMs: null,
          },
        }),
      ),
    );

    renderWithProviders(<Home />, {
      pathname: "/",
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "u1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByRole("link", { name: "Return to active match" })).toHaveAttribute(
      "href",
      "/online/room/room-1/play?matchId=match-1",
    );
  });
});
