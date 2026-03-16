import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/rooms/service", async () => {
  const actual = await vi.importActual<typeof import("@/server/rooms/service")>("@/server/rooms/service");

  return {
    ...actual,
    getRealtimeBootstrapSnapshot: vi.fn(),
    saveRealtimeMatchState: vi.fn(),
  };
});

vi.mock("@/server/rooms/repository", () => ({
  findCurrentMatchIdByRoomId: vi.fn(),
  hasUserLeftRoom: vi.fn(),
}));

import { POST as bootstrapRoute } from "@/app/api/internal/realtime/bootstrap/route";
import { POST as currentMatchRoute } from "@/app/api/internal/realtime/current-match/route";
import { POST as matchStateRoute } from "@/app/api/internal/realtime/match-state/route";
import { POST as memberStateRoute } from "@/app/api/internal/realtime/member-state/route";
import {
  getRealtimeBootstrapSnapshot,
  RoomServiceError,
  saveRealtimeMatchState,
} from "@/server/rooms/service";
import { findCurrentMatchIdByRoomId, hasUserLeftRoom } from "@/server/rooms/repository";

function createInternalRequest(body: unknown, secret = "test-secret") {
  return new Request("http://localhost", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-realtime-internal-secret": secret,
    },
    body: JSON.stringify(body),
  });
}

describe("internal realtime api routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.REALTIME_INTERNAL_SECRET = "test-secret";
  });

  it("forbids bootstrap without valid internal secret", async () => {
    const response = await bootstrapRoute(createInternalRequest({}, "wrong-secret"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("returns bootstrap snapshot for valid internal request", async () => {
    vi.mocked(getRealtimeBootstrapSnapshot).mockResolvedValue({
      roomId: "room-1",
      matchId: "match-1",
      revision: 3,
      phase: "player_turn",
      currentRoll: 2,
      playerBoard: [[], [], []],
      botBoard: [[], [], []],
      scores: { player: 0, bot: 0 },
      winner: null,
      turnUserId: "user-1",
      players: {
        seat1: "user-1",
        seat2: "user-2",
      },
    });

    const response = await bootstrapRoute(
      createInternalRequest({
        roomId: "room-1",
        matchId: "match-1",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      revision: 3,
      snapshot: {
        roomId: "room-1",
        matchId: "match-1",
      },
    });
  });

  it("persists realtime match state", async () => {
    const snapshot = {
      roomId: "room-1",
      matchId: "match-1",
      revision: 4,
      phase: "finished",
      currentRoll: null,
      playerBoard: [[], [], []],
      botBoard: [[], [], []],
      scores: { player: 10, bot: 4 },
      winner: "player" as const,
      turnUserId: null,
      players: {
        seat1: "user-1",
        seat2: "user-2",
      },
    };

    const response = await matchStateRoute(
      createInternalRequest({
        roomId: "room-1",
        matchId: "match-1",
        snapshot,
        finished: true,
      }),
    );

    expect(saveRealtimeMatchState).toHaveBeenCalledWith({
      roomId: "room-1",
      matchId: "match-1",
      snapshot,
      finished: true,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("maps room service errors in match-state route", async () => {
    vi.mocked(saveRealtimeMatchState).mockRejectedValue(new RoomServiceError("nope", 404));

    const response = await matchStateRoute(
      createInternalRequest({
        roomId: "room-1",
        matchId: "match-1",
        snapshot: { revision: 1 },
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "nope" });
  });

  it("returns current match id", async () => {
    vi.mocked(findCurrentMatchIdByRoomId).mockResolvedValue("match-1");

    const response = await currentMatchRoute(
      createInternalRequest({
        roomId: "room-1",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ matchId: "match-1" });
  });

  it("returns member left state", async () => {
    vi.mocked(hasUserLeftRoom).mockResolvedValue(true);

    const response = await memberStateRoute(
      createInternalRequest({
        roomId: "room-1",
        userId: "user-1",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ left: true });
  });
});
