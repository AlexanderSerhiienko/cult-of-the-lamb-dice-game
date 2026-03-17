import { beforeEach, describe, expect, it } from "vitest";
import {
  BOT_DIFFICULTY,
  GAME_MODE,
  GAME_PHASE,
  GAME_RESULT,
  GAME_STATUS,
  PLAYER,
} from "@/features/game/core/types";
import type { Board } from "@/features/game/core/types";
import { useGameStore } from "./use-game-store";

const BOT_DIFFICULTY_STORAGE_KEY = "knucklebones.botDifficulty";

function countDice(board: Board): number {
  return board[0].length + board[1].length + board[2].length;
}

describe("useGameStore", () => {
  beforeEach(() => {
    useGameStore.getState().setGameMode(GAME_MODE.PVB);
    useGameStore.getState().resetGame();
  });

  it("resets game state to idle", () => {
    useGameStore.getState().startGame();
    useGameStore.getState().resetGame();

    const state = useGameStore.getState();

    expect(state.status).toBe(GAME_STATUS.IDLE);
    expect(state.phase).toBe(GAME_PHASE.IDLE);
    expect(state.seat1Board).toEqual([[], [], []]);
    expect(state.seat2Board).toEqual([[], [], []]);
    expect(state.seatScores).toEqual({ seat1: 0, seat2: 0 });
    expect(state.currentRoll).toBeNull();
    expect(state.winner).toBeNull();
  });

  it("rematch fully resets state into active game", () => {
    useGameStore.getState().startGame();
    useGameStore.setState({
      seat1Board: [[1], [2], []],
      seat2Board: [[3], [], []],
      seatScores: { seat1: 3, seat2: 3 },
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
    expect(state.seat1Board).toEqual([[], [], []]);
    expect(state.seat2Board).toEqual([[], [], []]);
    expect(state.seatScores).toEqual({ seat1: 0, seat2: 0 });
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
      seat1Board: [[2], [3], []],
      seat2Board: [[1], [4], []],
    });

    useGameStore.getState().finishGame();
    const state = useGameStore.getState();

    expect(state.winner).toBe(GAME_RESULT.DRAW);
    expect(state.seatScores).toEqual({ seat1: 5, seat2: 5 });
    expect(state.phase).toBe(GAME_PHASE.FINISHED);
    expect(state.status).toBe(GAME_STATUS.FINISHED);
  });

  it("ignores second place action in same player turn", () => {
    useGameStore.getState().startGame();

    const beforeFirstPlace = useGameStore.getState().seat1Board;
    useGameStore.getState().placePlayerDie(0);
    const afterFirstPlace = useGameStore.getState().seat1Board;
    useGameStore.getState().placePlayerDie(1);
    const afterSecondPlace = useGameStore.getState().seat1Board;

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

  it("updates game mode in store", () => {
    useGameStore.getState().setGameMode(GAME_MODE.LOCAL_PVP);

    const state = useGameStore.getState();
    expect(state.gameMode).toBe(GAME_MODE.LOCAL_PVP);
  });

  it("resetGame keeps selected game mode", () => {
    useGameStore.getState().setGameMode(GAME_MODE.LOCAL_PVP);
    useGameStore.getState().startGame();
    useGameStore.getState().resetGame();

    const state = useGameStore.getState();
    expect(state.gameMode).toBe(GAME_MODE.LOCAL_PVP);
    expect(state.status).toBe(GAME_STATUS.IDLE);
  });

  it("local mode alternates turns without botMove", () => {
    useGameStore.getState().setGameMode(GAME_MODE.LOCAL_PVP);
    useGameStore.getState().startGame();

    useGameStore.getState().placePlayerDie(0);
    let state = useGameStore.getState();
    expect(state.phase).toBe(GAME_PHASE.BOT_TURN);
    expect(state.currentRoll).not.toBeNull();

    const diceBeforeSecondTurn = countDice(state.seat2Board);
    useGameStore.getState().placePlayerDie(0);

    state = useGameStore.getState();
    expect(state.phase).toBe(GAME_PHASE.PLAYER_TURN);
    expect(state.currentRoll).not.toBeNull();
    expect(countDice(state.seat2Board)).toBe(diceBeforeSecondTurn + 1);
  });

  it("ignores botMove in local mode", () => {
    useGameStore.getState().setGameMode(GAME_MODE.LOCAL_PVP);
    useGameStore.getState().startGame();
    useGameStore.getState().placePlayerDie(0);

    const before = useGameStore.getState();
    const beforeBotDice = countDice(before.seat2Board);
    const beforePlayerDice = countDice(before.seat1Board);
    const beforeRoll = before.currentRoll;

    useGameStore.getState().botMove();

    const after = useGameStore.getState();
    expect(after.phase).toBe(GAME_PHASE.BOT_TURN);
    expect(countDice(after.seat2Board)).toBe(beforeBotDice);
    expect(countDice(after.seat1Board)).toBe(beforePlayerDice);
    expect(after.currentRoll).toBe(beforeRoll);
  });

  it("creates match report context on startGame", () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    expect(state.matchId).not.toBeNull();
    expect(state.reportStatus).toBe("idle");
    expect(state.reportedAt).toBeNull();
    expect(state.reportError).toBeNull();
  });

  it("sets pending report status on finish in bot mode", () => {
    useGameStore.getState().setGameMode(GAME_MODE.PVB);
    useGameStore.getState().startGame();
    useGameStore.setState({
      seat1Board: [[6], [], []],
      seat2Board: [[1], [], []],
    });

    useGameStore.getState().finishGame();
    const state = useGameStore.getState();

    expect(state.phase).toBe(GAME_PHASE.FINISHED);
    expect(state.reportStatus).toBe("pending");
  });

  it("keeps idle report status on finish in local mode", () => {
    useGameStore.getState().setGameMode(GAME_MODE.LOCAL_PVP);
    useGameStore.getState().startGame();
    useGameStore.setState({
      seat1Board: [[6], [], []],
      seat2Board: [[1], [], []],
    });

    useGameStore.getState().finishGame();
    const state = useGameStore.getState();

    expect(state.phase).toBe(GAME_PHASE.FINISHED);
    expect(state.reportStatus).toBe("idle");
  });

  it("updates report status metadata", () => {
    useGameStore.getState().setReportStatus("sent", {
      reportedAt: 123,
      reportError: null,
    });
    const state = useGameStore.getState();

    expect(state.reportStatus).toBe("sent");
    expect(state.reportedAt).toBe(123);
    expect(state.reportError).toBeNull();
  });

});
