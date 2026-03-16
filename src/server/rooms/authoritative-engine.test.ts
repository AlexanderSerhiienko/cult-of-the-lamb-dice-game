import { describe, expect, it } from "vitest";
import { applyOnlineMove, createInitialOnlineSnapshot } from "@/server/rooms/authoritative-engine";

describe("authoritative online engine", () => {
  it("applies move for current player and increments revision", () => {
    const snapshot = createInitialOnlineSnapshot({
      roomId: "room_1",
      matchId: "match_1",
      seat1UserId: "u1",
      seat2UserId: "u2",
    });

    const next = applyOnlineMove({
      snapshot: {
        ...snapshot,
        currentRoll: 3,
      },
      userId: "u1",
      columnIndex: 0,
    });

    expect(next.revision).toBe(snapshot.revision + 1);
    expect(next.playerBoard[0]).toEqual([3]);
    expect(next.turnUserId).toBe("u2");
  });

  it("rejects move from non-active user", () => {
    const snapshot = createInitialOnlineSnapshot({
      roomId: "room_1",
      matchId: "match_1",
      seat1UserId: "u1",
      seat2UserId: "u2",
    });

    expect(() =>
      applyOnlineMove({
        snapshot: {
          ...snapshot,
          currentRoll: 5,
        },
        userId: "u2",
        columnIndex: 1,
      }),
    ).toThrow("Not your turn");
  });
});
