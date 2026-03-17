"use client";

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { renderWithProviders } from "@/test/render";

describe("AppShell", () => {
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

    expect(screen.getByRole("link", { name: "Back" })).toBeInTheDocument();
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
  });
});
