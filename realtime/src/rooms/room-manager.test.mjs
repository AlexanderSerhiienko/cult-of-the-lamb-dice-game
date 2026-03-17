import { describe, expect, it } from "vitest";
import { RoomManager } from "./room-manager.mjs";

describe("RoomManager", () => {
  it("does not mark a user disconnected while another socket is still active", () => {
    const manager = new RoomManager();

    manager.connectPlayer("room-1", "user-1", "socket-a");
    manager.connectPlayer("room-1", "user-1", "socket-b");

    const firstDisconnect = manager.disconnectPlayer("room-1", "user-1", "socket-a");
    expect(firstDisconnect?.fullyDisconnected).toBe(false);
    expect(firstDisconnect?.state.players["user-1"].disconnectedAt).toBeNull();

    const secondDisconnect = manager.disconnectPlayer("room-1", "user-1", "socket-b");
    expect(secondDisconnect?.fullyDisconnected).toBe(true);
    expect(secondDisconnect?.state.players["user-1"].disconnectedAt).not.toBeNull();
  });

  it("prunes stale rooms, matches, and expired move buckets", () => {
    const manager = new RoomManager();

    manager.connectPlayer("room-1", "user-1", "socket-a");
    manager.disconnectPlayer("room-1", "user-1", "socket-a");
    manager.setMatch("match-1", {
      roomId: "room-1",
      matchId: "match-1",
      winner: "seat1",
    });
    manager.consumeMoveRateLimit("user-1", 20, 1);

    const now = Date.now();
    manager.rooms.get("room-1").updatedAt = now - 60_000;
    manager.matchTouchedAt.set("match-1", now - 60_000);
    manager.moveBuckets.set("user-1", {
      count: 1,
      resetAt: now - 1,
    });

    const result = manager.pruneStaleState({
      now,
      staleRoomMs: 30_000,
      staleMatchMs: 30_000,
    });

    expect(result).toEqual({
      removedRooms: 1,
      removedMatches: 1,
      removedMoveBuckets: 1,
    });
    expect(manager.rooms.size).toBe(0);
    expect(manager.matches.size).toBe(0);
    expect(manager.moveBuckets.size).toBe(0);
  });
});
