"use client";

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OnlineStatusBanner } from "@/features/online/components/online-status-banner";
import { renderWithProviders } from "@/test/render";
import type { OnlineUiStatus } from "@/features/online/types";

describe("OnlineStatusBanner", () => {
  const cases: Array<{ status: OnlineUiStatus; expectedText: string }> = [
    { status: "loading", expectedText: "Connecting to realtime service..." },
    { status: "connecting", expectedText: "Connecting to realtime service..." },
    { status: "reconnecting", expectedText: "Connection interrupted. Retrying..." },
    { status: "opponent_left", expectedText: "Opponent left the match. You win immediately." },
    { status: "sync_error", expectedText: "Game state sync failed. Please try again." },
    { status: "service_unavailable", expectedText: "Realtime service is unavailable. Reconnecting..." },
  ];

  it.each(cases)("renders $status state", ({ status, expectedText }) => {
    renderWithProviders(
      <OnlineStatusBanner status={status} opponentDisconnectSecondsLeft={null} error={null} />,
    );

    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it("renders reconnect countdown for disconnected opponent", () => {
    renderWithProviders(
      <OnlineStatusBanner status="opponent_disconnected" opponentDisconnectSecondsLeft={19} error={null} />,
    );

    expect(screen.getByText(/Waiting for reconnect: 19s/)).toBeInTheDocument();
  });

  it("does not render a banner for move pending", () => {
    const { container } = renderWithProviders(
      <OnlineStatusBanner status="move_pending" opponentDisconnectSecondsLeft={null} error={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
