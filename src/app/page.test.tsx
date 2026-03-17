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

    expect(screen.getByRole("link", { name: "Play vs Bot" })).toHaveAttribute("href", "/game/bot");
    expect(screen.getByRole("link", { name: "Local PvP" })).toHaveAttribute("href", "/game/local");
    expect(screen.getByRole("button", { name: "Private PvP (sign in required)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ranked (sign in required)" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute("href", "/leaderboard");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByText("How to play")).toBeInTheDocument();
    expect(screen.getByText(/A die rolls automatically at the start of your turn/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /active match/i })).not.toBeInTheDocument();
  });

  it("surfaces the active match CTA for authenticated users", async () => {
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.includes("/api/ranked/profile")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              profile: {
                userId: "u1",
                mmr: 420,
                rank: "Silver",
                progressPct: 40,
                rankFloorMmr: 300,
                nextRankMmr: 600,
                wins: 10,
                losses: 7,
                draws: 1,
              },
            }),
          ),
        );
      }

      return Promise.resolve(
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
    });

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

    expect(screen.getByRole("link", { name: "Private PvP" })).toHaveAttribute("href", "/online");
    expect(screen.getByRole("link", { name: "Ranked" })).toHaveAttribute("href", "/ranked");
    expect(await screen.findByRole("link", { name: "Return to active match" })).toHaveAttribute(
      "href",
      "/online/room/room-1/play?matchId=match-1",
    );
  });
});
