"use client";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsContent from "@/app/settings/settings-content";
import { BOT_DIFFICULTY } from "@/features/game/core/types";
import { renderWithProviders } from "@/test/render";

describe("SettingsContent", () => {
  it("renders current settings and back link", () => {
    renderWithProviders(<SettingsContent />, {
      pathname: "/settings",
      storeOptions: {
        initialState: {
          botDifficulty: BOT_DIFFICULTY.MEDIUM,
          soundEnabled: true,
        },
      },
    });

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: "On" })).toBeInTheDocument();
  });

  it("changes bot difficulty and shows saved toast", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const { user, store } = renderWithProviders(<SettingsContent />, {
      pathname: "/settings",
      storeOptions: {
        initialState: {
          botDifficulty: BOT_DIFFICULTY.MEDIUM,
          soundEnabled: true,
        },
      },
    });

    await user.click(screen.getByRole("radio", { name: /Hard/i }));

    expect(store.getState().botDifficulty).toBe(BOT_DIFFICULTY.HARD);
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("toggles sound setting and shows saved toast", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const { user, store } = renderWithProviders(<SettingsContent />, {
      pathname: "/settings",
      storeOptions: {
        initialState: {
          botDifficulty: BOT_DIFFICULTY.MEDIUM,
          soundEnabled: true,
        },
      },
    });

    await user.click(screen.getByRole("button", { name: "On" }));

    expect(store.getState().soundEnabled).toBe(false);
    expect(screen.getByRole("button", { name: "Off" })).toBeInTheDocument();
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });
});
