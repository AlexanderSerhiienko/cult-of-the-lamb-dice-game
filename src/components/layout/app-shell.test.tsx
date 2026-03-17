"use client";

import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { renderWithProviders } from "@/test/render";

describe("AppShell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render a back link on the home route", () => {
    renderWithProviders(
      <AppShell>
        <div>Home content</div>
      </AppShell>,
      {
        pathname: "/",
      },
    );

    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Main menu" })).not.toBeInTheDocument();
  });

  it("renders game actions on game routes", () => {
    renderWithProviders(
      <AppShell>
        <div>Game content</div>
      </AppShell>,
      {
        pathname: "/game/local",
      },
    );

    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("renders online actions on online play routes", () => {
    renderWithProviders(
      <AppShell>
        <div>Online content</div>
      </AppShell>,
      {
        pathname: "/online/room/room-1/play",
      },
    );

    expect(screen.getByRole("button", { name: "Leave match" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New game" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();
  });

  it("does not render a back link on stateful lobby and ranked match routes", () => {
    const { unmount } = renderWithProviders(
      <AppShell>
        <div>Lobby content</div>
      </AppShell>,
      {
        pathname: "/online/room/room-1",
      },
    );

    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();

    unmount();

    renderWithProviders(
      <AppShell>
        <div>Ranked match content</div>
      </AppShell>,
      {
        pathname: "/ranked/match/match-1",
      },
    );

    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();
  });

  it("never renders shell-level back links on ranked queue", () => {
    renderWithProviders(
      <AppShell>
        <div>Ranked queue content</div>
      </AppShell>,
      {
        pathname: "/ranked",
        searchParams: { searching: "1" },
      },
    );

    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();
  });

  it("renders the ranked summary in the unified account panel for authenticated regular pages", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
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

    renderWithProviders(
      <AppShell>
        <div>Home content</div>
      </AppShell>,
      {
        pathname: "/",
        session: {
          status: "authenticated",
          data: {
            expires: "2099-01-01T00:00:00.000Z",
            user: { id: "u1", name: "Alex", email: "alex@example.com" },
          },
        },
      },
    );

    expect(await screen.findByRole("link", { name: "Ranked profile: Silver" })).toHaveAttribute("href", "/ranked");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("hides ranked summary on ranked and live match pages", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
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

    const { unmount } = renderWithProviders(
      <AppShell>
        <div>Ranked queue content</div>
      </AppShell>,
      {
        pathname: "/ranked",
        searchParams: {},
        session: {
          status: "authenticated",
          data: {
            expires: "2099-01-01T00:00:00.000Z",
            user: { id: "u1", name: "Alex", email: "alex@example.com" },
          },
        },
      },
    );

    expect(screen.queryByRole("link", { name: "Ranked profile: Silver" })).not.toBeInTheDocument();

    unmount();

    renderWithProviders(
      <AppShell>
        <div>Online match content</div>
      </AppShell>,
      {
        pathname: "/online/room/room-1/play",
        session: {
          status: "authenticated",
          data: {
            expires: "2099-01-01T00:00:00.000Z",
            user: { id: "u1", name: "Alex", email: "alex@example.com" },
          },
        },
      },
    );

    expect(screen.queryByRole("link", { name: "Ranked profile: Silver" })).not.toBeInTheDocument();
  });

  it("does not render shell-level back links on safe subpages anymore", () => {
    const firstRender = renderWithProviders(
      <AppShell>
        <div>Online entry</div>
      </AppShell>,
      {
        pathname: "/online",
      },
    );

    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();

    firstRender.unmount();

    const secondRender = renderWithProviders(
      <AppShell>
        <div>Leaderboard</div>
      </AppShell>,
      {
        pathname: "/leaderboard",
      },
    );

    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();

    secondRender.unmount();

    renderWithProviders(
      <AppShell>
        <div>Settings</div>
      </AppShell>,
      {
        pathname: "/settings",
      },
    );

    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();
  });

  it("shows account-only header state for authenticated users when ranked summary is hidden", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
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

    renderWithProviders(
      <AppShell>
        <div>Ranked queue content</div>
      </AppShell>,
      {
        pathname: "/ranked",
        session: {
          status: "authenticated",
          data: {
            expires: "2099-01-01T00:00:00.000Z",
            user: { id: "u1", name: "Alex", email: "alex@example.com" },
          },
        },
      },
    );

    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ranked profile: Silver" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
