"use client";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LeaderboardPage from "@/app/leaderboard/page";
import { renderWithProviders } from "@/test/render";

describe("LeaderboardPage", () => {
  it("renders leaderboard entries after loading", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          mode: "bot",
          entries: [
            {
              userId: "user-1",
              displayName: "Alex",
              image: null,
              games: 12,
              wins: 8,
              losses: 3,
              draws: 1,
              totalScore: 144,
              bestScore: 24,
              winRate: 67,
            },
          ],
        }),
      ),
    );

    renderWithProviders(<LeaderboardPage />, {
      pathname: "/leaderboard",
    });

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(await screen.findByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("8/3/1")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Main menu" })).toHaveAttribute("href", "/");
  });

  it("renders an error when leaderboard fetch fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    renderWithProviders(<LeaderboardPage />, {
      pathname: "/leaderboard",
    });

    expect(await screen.findByText("Failed to load leaderboard")).toBeInTheDocument();
  });
});
