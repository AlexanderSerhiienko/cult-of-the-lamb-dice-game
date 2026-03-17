"use client";

import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { GameModePage } from "@/features/game/components/game-mode-page";
import { createScriptedDiceSource } from "@/features/game/store/game-store-deps";
import { GAME_MODE, GAME_PHASE, GAME_STATUS } from "@/features/game/core/types";
import { renderWithProviders } from "@/test/render";

describe("GamePageContent", () => {
  it("supports deterministic local PvP turn sequence", async () => {
    const { user, store } = renderWithProviders(
      <AppShell>
        <GameModePage mode={GAME_MODE.LOCAL_PVP} />
      </AppShell>,
      {
        pathname: "/game/local",
        storeOptions: {
          deps: {
            diceSource: createScriptedDiceSource([6, 2, 5]),
            createMatchId: () => "match-local-1",
          },
          initialState: {
            gameMode: GAME_MODE.LOCAL_PVP,
          },
        },
      },
    );

    await user.click(screen.getByRole("button", { name: "New game" }));

    expect(store.getState().currentRoll).toBe(6);
    await user.click(screen.getByRole("button", { name: "Player 1 board column 1" }));
    expect(store.getState().seat1Board[0]).toEqual([6]);
    expect(store.getState().phase).toBe(GAME_PHASE.BOT_TURN);
    expect(store.getState().currentRoll).toBe(2);

    await user.click(screen.getByRole("button", { name: "Player 2 board column 2" }));
    expect(store.getState().seat2Board[1]).toEqual([2]);
    expect(store.getState().phase).toBe(GAME_PHASE.PLAYER_TURN);
    expect(store.getState().currentRoll).toBe(5);
  });

  it("resets the game through header action", async () => {
    const { user, store } = renderWithProviders(
      <AppShell>
        <GameModePage mode={GAME_MODE.LOCAL_PVP} />
      </AppShell>,
      {
        pathname: "/game/local",
        storeOptions: {
          deps: {
            diceSource: createScriptedDiceSource([4, 3, 2]),
            createMatchId: () => "match-local-2",
          },
          initialState: {
            gameMode: GAME_MODE.LOCAL_PVP,
          },
        },
      },
    );

    await user.click(screen.getByRole("button", { name: "New game" }));
    await user.click(screen.getByRole("button", { name: "Player 1 board column 1" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(store.getState().status).toBe(GAME_STATUS.IDLE);
    expect(store.getState().seat1Board).toEqual([[], [], []]);
    expect(store.getState().seat2Board).toEqual([[], [], []]);
  });

  it("shows the result modal when a finishing move is made", async () => {
    const { user } = renderWithProviders(
      <GameModePage mode={GAME_MODE.LOCAL_PVP} />,
      {
        pathname: "/game/local",
        storeOptions: {
          deps: {
            diceSource: createScriptedDiceSource([1]),
            createMatchId: () => "match-local-3",
          },
          initialState: {
            gameMode: GAME_MODE.LOCAL_PVP,
            phase: GAME_PHASE.PLAYER_TURN,
            status: GAME_STATUS.IN_PROGRESS,
            currentRoll: 1,
            interactionLocked: false,
            seat1Board: [[6, 6, 6], [5, 5, 5], [4, 4]],
            seat2Board: [[1], [1], [1]],
            seatScores: { seat1: 0, seat2: 0 },
            winner: null,
          },
        },
      },
    );

    await user.click(screen.getByRole("button", { name: "Player 1 board column 3" }));

    await waitFor(() => {
      expect(screen.getByText("Player 1 wins")).toBeInTheDocument();
      expect(screen.getByText(/Final score:/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Back to menu" })).toHaveAttribute("href", "/");
    });
  });

  it("runs a deterministic PvB turn cycle with scripted dice", async () => {
    const { user, store } = renderWithProviders(
      <AppShell>
        <GameModePage mode={GAME_MODE.PVB} />
      </AppShell>,
      {
        pathname: "/game",
        storeOptions: {
          deps: {
            diceSource: createScriptedDiceSource([6, 2, 5]),
            createMatchId: () => "match-pvb-1",
          },
          initialState: {
            gameMode: GAME_MODE.PVB,
          },
        },
      },
    );

    await user.click(screen.getByRole("button", { name: "New game" }));
    await user.click(screen.getByRole("button", { name: "Player board column 1" }));

    expect(store.getState().phase).toBe(GAME_PHASE.BOT_TURN);

    await waitFor(
      () => {
        expect(store.getState().phase).toBe(GAME_PHASE.PLAYER_TURN);
        expect(store.getState().currentRoll).toBe(5);
        expect(store.getState().seat2Board.some((column) => column.length === 1)).toBe(true);
      },
      { timeout: 1_000 },
    );
  });

  it("starts a fresh match when rematch is clicked from the result modal", async () => {
    const { user, store } = renderWithProviders(<GameModePage mode={GAME_MODE.LOCAL_PVP} />, {
      pathname: "/game/local",
        storeOptions: {
          deps: {
            diceSource: createScriptedDiceSource([5]),
            createMatchId: () => "match-local-rematch",
          },
        initialState: {
          gameMode: GAME_MODE.LOCAL_PVP,
          phase: GAME_PHASE.PLAYER_TURN,
          status: GAME_STATUS.IN_PROGRESS,
          currentRoll: 1,
          interactionLocked: false,
          seat1Board: [[6, 6, 6], [5, 5, 5], [4, 4]],
          seat2Board: [[1], [1], [1]],
          seatScores: { seat1: 0, seat2: 0 },
          winner: null,
        },
      },
    });

    await user.click(screen.getByRole("button", { name: "Player 1 board column 3" }));
    expect(await screen.findByText("Player 1 wins")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rematch" }));

    await waitFor(() => {
      expect(screen.queryByText("Player 1 wins")).not.toBeInTheDocument();
      expect(store.getState().status).toBe(GAME_STATUS.IN_PROGRESS);
      expect(store.getState().phase).toBe(GAME_PHASE.PLAYER_TURN);
      expect(store.getState().currentRoll).toBe(5);
      expect(store.getState().seat1Board).toEqual([[], [], []]);
      expect(store.getState().seat2Board).toEqual([[], [], []]);
    });
  });

  it("does not place a die into a full column", async () => {
    const { user, store } = renderWithProviders(<GameModePage mode={GAME_MODE.LOCAL_PVP} />, {
      pathname: "/game/local",
      storeOptions: {
        deps: {
          diceSource: createScriptedDiceSource([4]),
          createMatchId: () => "match-local-full-column",
        },
        initialState: {
          gameMode: GAME_MODE.LOCAL_PVP,
          phase: GAME_PHASE.PLAYER_TURN,
          status: GAME_STATUS.IN_PROGRESS,
          currentRoll: 4,
          interactionLocked: false,
          seat1Board: [[1, 2, 3], [], []],
          seat2Board: [[], [], []],
          seatScores: { seat1: 0, seat2: 0 },
          winner: null,
        },
      },
    });

    const fullColumn = screen.getByRole("button", { name: "Player 1 board column 1" });
    expect(fullColumn).toBeDisabled();

    await user.click(fullColumn);

    expect(store.getState().seat1Board[0]).toEqual([1, 2, 3]);
    expect(store.getState().currentRoll).toBe(4);
  });
});
