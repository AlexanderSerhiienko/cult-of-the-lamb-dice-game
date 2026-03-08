import { beforeEach, describe, expect, it } from "vitest";
import type { Board } from "@/features/game/core/types";
import { useGameStore } from "./use-game-store";

function countDice(board: Board): number {
  return board[0].length + board[1].length + board[2].length;
}

describe("useGameStore", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it("resets game state to idle", () => {
    useGameStore.getState().startGame();
    useGameStore.getState().resetGame();

    const state = useGameStore.getState();

    expect(state.status).toBe("idle");
    expect(state.phase).toBe("idle");
    expect(state.playerBoard).toEqual([[], [], []]);
    expect(state.botBoard).toEqual([[], [], []]);
    expect(state.scores).toEqual({ player: 0, bot: 0 });
    expect(state.currentRoll).toBeNull();
    expect(state.winner).toBeNull();
  });

  it("rematch fully resets state into active game", () => {
    useGameStore.getState().startGame();
    useGameStore.setState({
      playerBoard: [[1], [2], []],
      botBoard: [[3], [], []],
      scores: { player: 3, bot: 3 },
      winner: "draw",
      phase: "finished",
      status: "finished",
      interactionLocked: true,
    });

    useGameStore.getState().rematch();
    const state = useGameStore.getState();

    expect(state.phase).toBe("player_turn");
    expect(state.status).toBe("in_progress");
    expect(state.interactionLocked).toBe(false);
    expect(state.playerBoard).toEqual([[], [], []]);
    expect(state.botBoard).toEqual([[], [], []]);
    expect(state.scores).toEqual({ player: 0, bot: 0 });
    expect(state.currentRoll).not.toBeNull();
    expect(state.winner).toBeNull();
  });

  it("startGame creates auto roll for player", () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    const roll = state.currentRoll;

    expect(state.phase).toBe("player_turn");
    expect(state.turn).toBe("player");
    expect(roll).not.toBeNull();
    if (roll === null) {
      throw new Error("Expected player roll");
    }
    expect(roll).toBeGreaterThanOrEqual(1);
    expect(roll).toBeLessThanOrEqual(6);
  });

  it("sets draw on finish when scores are equal", () => {
    useGameStore.getState().startGame();
    useGameStore.setState({
      playerBoard: [[2], [3], []],
      botBoard: [[1], [4], []],
    });

    useGameStore.getState().finishGame();
    const state = useGameStore.getState();

    expect(state.winner).toBe("draw");
    expect(state.scores).toEqual({ player: 5, bot: 5 });
    expect(state.phase).toBe("finished");
    expect(state.status).toBe("finished");
  });

  it("ignores second place action in same player turn", () => {
    useGameStore.getState().startGame();

    const beforeFirstPlace = useGameStore.getState().playerBoard;
    useGameStore.getState().placePlayerDie(0);
    const afterFirstPlace = useGameStore.getState().playerBoard;
    useGameStore.getState().placePlayerDie(1);
    const afterSecondPlace = useGameStore.getState().playerBoard;

    expect(countDice(beforeFirstPlace)).toBe(0);
    expect(countDice(afterFirstPlace)).toBe(1);
    expect(countDice(afterSecondPlace)).toBe(1);
  });

  it("creates next auto roll after bot move", () => {
    useGameStore.getState().startGame();
    useGameStore.getState().placePlayerDie(0);
    useGameStore.getState().botMove();

    const state = useGameStore.getState();
    const roll = state.currentRoll;
    expect(state.phase).toBe("player_turn");
    expect(roll).not.toBeNull();
    if (roll === null) {
      throw new Error("Expected next player roll");
    }
    expect(roll).toBeGreaterThanOrEqual(1);
    expect(roll).toBeLessThanOrEqual(6);
  });
});
