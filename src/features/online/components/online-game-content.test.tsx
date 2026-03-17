"use client";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GAME_PHASE, GAME_STATUS, GAME_MODE } from "@/features/game/core/types";
import { OnlineGameContent } from "@/features/online/components/online-game-content";
import { createScriptedDiceSource } from "@/features/game/store/game-store-deps";
import { renderWithProviders } from "@/test/render";

describe("OnlineGameContent", () => {
  it("blocks board interaction when interaction is externally blocked", async () => {
    const onSelectColumn = vi.fn();
    const { user } = renderWithProviders(
      <OnlineGameContent mySeat={1} userId="u1" onSelectColumn={onSelectColumn} interactionBlocked />,
      {
        storeOptions: {
          deps: {
            diceSource: createScriptedDiceSource([4]),
            createMatchId: () => "match-1",
          },
          initialState: {
            gameMode: GAME_MODE.ONLINE_PRIVATE,
            phase: GAME_PHASE.PLAYER_TURN,
            status: GAME_STATUS.IN_PROGRESS,
            currentRoll: 4,
            onlineMySeat: 1,
            onlineTurnUserId: "u1",
            seat1Board: [[], [], []],
            seat2Board: [[], [], []],
            winner: null,
          },
        },
      },
    );

    const firstColumn = screen.getByRole("button", { name: "Your board column 1" });
    expect(firstColumn).toBeDisabled();

    await user.click(firstColumn);
    expect(onSelectColumn).not.toHaveBeenCalled();
  });

  it("allows selecting a valid column on your turn", async () => {
    const onSelectColumn = vi.fn();
    const { user } = renderWithProviders(
      <OnlineGameContent mySeat={1} userId="u1" onSelectColumn={onSelectColumn} />,
      {
        storeOptions: {
          deps: {
            diceSource: createScriptedDiceSource([4]),
            createMatchId: () => "match-1",
          },
          initialState: {
            gameMode: GAME_MODE.ONLINE_PRIVATE,
            phase: GAME_PHASE.PLAYER_TURN,
            status: GAME_STATUS.IN_PROGRESS,
            currentRoll: 4,
            onlineMySeat: 1,
            onlineTurnUserId: "u1",
            seat1Board: [[], [], []],
            seat2Board: [[], [], []],
            winner: null,
          },
        },
      },
    );

    await user.click(screen.getByRole("button", { name: "Your board column 1" }));

    expect(onSelectColumn).toHaveBeenCalledWith(0);
  });
});
