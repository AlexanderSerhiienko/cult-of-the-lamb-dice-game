"use client";

import { act, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { describe, expect, it } from "vitest";
import { ActiveMatchAction } from "@/components/home/active-match-action";
import { renderWithProviders } from "@/test/render";

describe("ActiveMatchAction", () => {
  it("stays hidden for unauthenticated users", () => {
    renderWithProviders(<ActiveMatchAction />, {
      session: { status: "unauthenticated", data: null },
    });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders reconnect CTA for authenticated active match", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-03-17T10:00:00.000Z").getTime());
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          activeMatch: {
            roomId: "room-1",
            matchId: "match-1",
            reconnectDeadlineMs: new Date("2026-03-17T10:00:12.000Z").getTime(),
          },
        }),
      ),
    );

    renderWithProviders(<ActiveMatchAction />, {
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "user-1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByRole("link", { name: /Reconnect to active match/ })).toBeInTheDocument();
  });

  it("preserves last known match on transient fetch failure", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            activeMatch: {
              roomId: "room-1",
              matchId: "match-1",
              reconnectDeadlineMs: null,
            },
          }),
        ),
      )
      .mockRejectedValueOnce(new Error("network"));

    renderWithProviders(<ActiveMatchAction />, {
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "user-1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByRole("link", { name: "Return to active match" })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Return to active match" })).toBeInTheDocument();
    });
  });

  it("refreshes when the tab becomes visible again", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            activeMatch: {
              roomId: "room-1",
              matchId: "match-1",
              reconnectDeadlineMs: null,
            },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ activeMatch: null })));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    renderWithProviders(<ActiveMatchAction />, {
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "user-1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByRole("link", { name: "Return to active match" })).toBeInTheDocument();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Return to active match" })).not.toBeInTheDocument();
    });
  });

  it("polls for active match freshness every 15 seconds while visible", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            activeMatch: {
              roomId: "room-1",
              matchId: "match-1",
              reconnectDeadlineMs: null,
            },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ activeMatch: null })));
    let pollingCallback: (() => void) | null = null;
    vi.spyOn(window, "setInterval").mockImplementation((handler, delay) => {
      if (delay === 15_000) {
        pollingCallback = typeof handler === "function" ? handler : null;
      }
      return 1 as unknown as ReturnType<typeof window.setInterval>;
    });

    renderWithProviders(<ActiveMatchAction />, {
      session: {
        status: "authenticated",
        data: {
          expires: "2099-01-01T00:00:00.000Z",
          user: { id: "user-1", name: "Alex", email: "alex@example.com" },
        },
      },
    });

    expect(await screen.findByRole("link", { name: "Return to active match" })).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(pollingCallback).not.toBeNull();

    await act(async () => {
      pollingCallback?.();
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("link", { name: "Return to active match" })).not.toBeInTheDocument();
    });
  });
});
