import { describe, expect, it } from "vitest";
import {
  applyOnlineMove,
  canUserMove as canServerUserMove,
  type OnlineAuthoritativeSnapshot,
} from "@/server/rooms/authoritative-engine";
import {
  applyAuthoritativeMove as applyRealtimeMove,
  canUserMove as canRealtimeUserMove,
} from "../../../realtime/src/engine/authoritative-engine.mjs";

function createSnapshot(): OnlineAuthoritativeSnapshot {
  return {
    roomId: "room-1",
    matchId: "match-1",
    revision: 4,
    phase: "player_turn",
    currentRoll: 4,
    playerBoard: [[2], [5], []],
    botBoard: [[1, 4], [3], [6]],
    scores: {
      player: 7,
      bot: 14,
    },
    winner: null,
    turnUserId: "u1",
    players: {
      seat1: "u1",
      seat2: "u2",
    },
  };
}

describe("authoritative engine parity", () => {
  it("keeps move eligibility logic aligned between web and realtime engines", () => {
    const snapshot = createSnapshot();

    expect(canServerUserMove(snapshot, "u1")).toBe(true);
    expect(canRealtimeUserMove(snapshot, "u1")).toBe(true);
    expect(canServerUserMove(snapshot, "u2")).toBe(false);
    expect(canRealtimeUserMove(snapshot, "u2")).toBe(false);
  });

  it("produces the same snapshot after an equivalent move", () => {
    const snapshot = createSnapshot();

    const originalRandom = Math.random;
    Math.random = () => 0.5;

    try {
      const serverNext = applyOnlineMove({
        snapshot,
        userId: "u1",
        columnIndex: 2,
      });
      const realtimeNext = applyRealtimeMove({
        snapshot,
        userId: "u1",
        columnIndex: 2,
      });

      expect(realtimeNext).toEqual(serverNext);
    } finally {
      Math.random = originalRandom;
    }
  });
});
