import { beforeEach, describe, expect, it } from "vitest";
import { BOT_DIFFICULTY, GAME_PHASE, GAME_RESULT, GAME_STATUS, PLAYER } from "@/features/game/core/types";
import type { Board } from "@/features/game/core/types";
import { useGameStore } from "./use-game-store";

const BOT_DIFFICULTY_STORAGE_KEY = "knucklebones.botDifficulty";

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

    expect(state.status).toBe(GAME_STATUS.IDLE);
    expect(state.phase).toBe(GAME_PHASE.IDLE);
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
      winner: GAME_RESULT.DRAW,
      phase: GAME_PHASE.FINISHED,
      status: GAME_STATUS.FINISHED,
      interactionLocked: true,
    });

    useGameStore.getState().rematch();
    const state = useGameStore.getState();

    expect(state.phase).toBe(GAME_PHASE.PLAYER_TURN);
    expect(state.status).toBe(GAME_STATUS.IN_PROGRESS);
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

    expect(state.phase).toBe(GAME_PHASE.PLAYER_TURN);
    expect(state.turn).toBe(PLAYER.PLAYER);
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

    expect(state.winner).toBe(GAME_RESULT.DRAW);
    expect(state.scores).toEqual({ player: 5, bot: 5 });
    expect(state.phase).toBe(GAME_PHASE.FINISHED);
    expect(state.status).toBe(GAME_STATUS.FINISHED);
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
    expect(state.phase).toBe(GAME_PHASE.PLAYER_TURN);
    expect(roll).not.toBeNull();
    if (roll === null) {
      throw new Error("Expected next player roll");
    }
    expect(roll).toBeGreaterThanOrEqual(1);
    expect(roll).toBeLessThanOrEqual(6);
  });

  it("updates bot difficulty in store", () => {
    useGameStore.getState().setBotDifficulty(BOT_DIFFICULTY.HARD);
    const state = useGameStore.getState();

    expect(state.botDifficulty).toBe(BOT_DIFFICULTY.HARD);
  });

  it("resetGame keeps selected bot difficulty", () => {
    useGameStore.getState().setBotDifficulty(BOT_DIFFICULTY.EASY);
    useGameStore.getState().startGame();
    useGameStore.getState().resetGame();

    const state = useGameStore.getState();
    expect(state.botDifficulty).toBe(BOT_DIFFICULTY.EASY);
    expect(state.status).toBe(GAME_STATUS.IDLE);
  });

  it("persists bot difficulty to localStorage when window is available", () => {
    const storage = new Map<string, string>();
    const originalWindow = (globalThis as { window?: unknown }).window;

    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    };

    try {
      useGameStore.getState().setBotDifficulty(BOT_DIFFICULTY.HARD);
      expect(storage.get(BOT_DIFFICULTY_STORAGE_KEY)).toBe(BOT_DIFFICULTY.HARD);
    } finally {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

});
