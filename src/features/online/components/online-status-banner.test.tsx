"use client";

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OnlineStatusBanner } from "@/features/online/components/online-status-banner";
import { ONLINE_UI_STATUS, type OnlineUiStatus } from "@/features/online/types";
import { renderWithProviders } from "@/test/render";

describe("OnlineStatusBanner", () => {
  const cases: Array<{ status: OnlineUiStatus; expectedText: string }> = [
    { status: ONLINE_UI_STATUS.LOADING, expectedText: "Connecting to realtime service..." },
    { status: ONLINE_UI_STATUS.CONNECTING, expectedText: "Connecting to realtime service..." },
    { status: ONLINE_UI_STATUS.RECONNECTING, expectedText: "Connection interrupted. Retrying..." },
    { status: ONLINE_UI_STATUS.OPPONENT_LEFT, expectedText: "Opponent left the match. You win immediately." },
    { status: ONLINE_UI_STATUS.SYNC_ERROR, expectedText: "Game state sync failed. Please try again." },
    { status: ONLINE_UI_STATUS.SERVICE_UNAVAILABLE, expectedText: "Realtime service is unavailable. Reconnecting..." },
  ];

  it.each(cases)("renders $status state", ({ status, expectedText }) => {
    renderWithProviders(
      <OnlineStatusBanner status={status} opponentDisconnectSecondsLeft={null} error={null} />,
    );

    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it("renders reconnect countdown for disconnected opponent", () => {
    renderWithProviders(
      <OnlineStatusBanner
        status={ONLINE_UI_STATUS.OPPONENT_DISCONNECTED}
        opponentDisconnectSecondsLeft={19}
        error={null}
      />,
    );

    expect(screen.getByText(/Waiting for reconnect: 19s/)).toBeInTheDocument();
  });

  it("does not render a banner for move pending", () => {
    const { container } = renderWithProviders(
      <OnlineStatusBanner status={ONLINE_UI_STATUS.MOVE_PENDING} opponentDisconnectSecondsLeft={null} error={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
