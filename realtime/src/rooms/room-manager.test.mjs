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
});
