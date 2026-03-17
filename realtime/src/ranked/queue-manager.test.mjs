import { describe, expect, it } from "vitest";
import { RankedQueueManager } from "./queue-manager.mjs";

describe("RankedQueueManager", () => {
  it("stores one queue entry per user", () => {
    const queue = new RankedQueueManager();

    queue.enqueue({ userId: "u1", mmr: 100, joinedAt: 1 });
    queue.enqueue({ userId: "u1", mmr: 120, joinedAt: 2 });

    expect(queue.size()).toBe(1);
    expect(queue.get("u1")?.mmr).toBe(120);
  });

  it("matches players within the initial mmr window", () => {
    const queue = new RankedQueueManager();

    queue.enqueue({ userId: "u1", mmr: 400, joinedAt: 0 });
    queue.enqueue({ userId: "u2", mmr: 470, joinedAt: 0 });

    const match = queue.attemptMatch(5_000);

    expect(match).toMatchObject({
      seat1: { userId: "u1" },
      seat2: { userId: "u2" },
    });
    expect(queue.size()).toBe(0);
  });

  it("widens the allowed gap for longer waits", () => {
    const queue = new RankedQueueManager();

    queue.enqueue({ userId: "u1", mmr: 400, joinedAt: 0 });
    queue.enqueue({ userId: "u2", mmr: 620, joinedAt: 0 });

    expect(queue.attemptMatch(5_000)).toBeNull();
    expect(queue.attemptMatch(15_000)).toBeNull();

    const match = queue.attemptMatch(25_000);
    expect(match).not.toBeNull();
  });
});
