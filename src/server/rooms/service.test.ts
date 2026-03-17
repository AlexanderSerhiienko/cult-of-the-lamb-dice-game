import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/rooms/repository", () => ({
  addOrRestoreRoomMember: vi.fn(),
  closeRoomAfterMatchFinished: vi.fn(),
  createPendingMatchForRoom: vi.fn(),
  createPrivateRoom: vi.fn(),
  findMatchById: vi.fn(),
  findRoomByCode: vi.fn(),
  getRoomSnapshotById: vi.fn(),
  leaveRoomMember: vi.fn(),
  markMatchStarted: vi.fn(),
  updateMatchSnapshot: vi.fn(),
}));

vi.mock("@/server/matches/repository", () => ({
  upsertMatchResultForUser: vi.fn(),
}));

import {
  createRoomForUser,
  getRealtimeBootstrapSnapshot,
  joinRoomByCode,
  saveRealtimeMatchState,
  startRoomMatch,
} from "@/server/rooms/service";
import type { OnlineAuthoritativeSnapshot } from "@/server/rooms/authoritative-engine";
import * as roomRepository from "@/server/rooms/repository";
import type { RoomSnapshot } from "@/server/rooms/types";
import * as matchesRepository from "@/server/matches/repository";

function createRoomSnapshot(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
  return {
    room: {
      id: "room-1",
      code: "ABC123",
      status: "WAITING",
      hostId: "host-1",
      createdAt: new Date("2026-03-16T10:00:00Z"),
    },
    currentMatchId: null,
    members: [
      {
        userId: "host-1",
        role: "HOST",
        joinedAt: new Date("2026-03-16T10:00:00Z"),
        leftAt: null,
        name: "Host",
        email: "host@example.com",
      },
      {
        userId: "player-2",
        role: "PLAYER",
        joinedAt: new Date("2026-03-16T10:01:00Z"),
        leftAt: null,
        name: "Player 2",
        email: "p2@example.com",
      },
    ],
    ...overrides,
  };
}

describe("room service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("creates a room for the user", async () => {
    vi.mocked(roomRepository.createPrivateRoom).mockResolvedValue(createRoomSnapshot());

    const room = await createRoomForUser("host-1");

    expect(roomRepository.createPrivateRoom).toHaveBeenCalled();
    expect(room.room.hostId).toBe("host-1");
  });

  it("retries room creation only for room code collisions", async () => {
    const collisionError = new Prisma.PrismaClientKnownRequestError("duplicate", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["code"] },
    });
    vi.mocked(roomRepository.createPrivateRoom)
      .mockRejectedValueOnce(collisionError)
      .mockResolvedValueOnce(createRoomSnapshot());

    const room = await createRoomForUser("host-1");

    expect(room.room.hostId).toBe("host-1");
    expect(roomRepository.createPrivateRoom).toHaveBeenCalledTimes(2);
  });

  it("does not retry room creation for non-collision failures", async () => {
    vi.mocked(roomRepository.createPrivateRoom).mockRejectedValueOnce(new Error("db offline"));

    await expect(createRoomForUser("host-1")).rejects.toMatchObject({
      message: "Failed to create room",
      statusCode: 500,
    });

    expect(roomRepository.createPrivateRoom).toHaveBeenCalledTimes(1);
  });

  it("rejects joining a full room when user is not already a member", async () => {
    vi.mocked(roomRepository.findRoomByCode).mockResolvedValue({
      room: {
        id: "room-1",
        code: "ABC123",
        status: "WAITING",
        hostId: "host-1",
        createdAt: new Date(),
      },
      currentMatchId: null,
      members: [
        {
          userId: "host-1",
          role: "HOST",
          joinedAt: new Date(),
          leftAt: null,
          name: null,
          email: null,
        },
        {
          userId: "player-2",
          role: "PLAYER",
          joinedAt: new Date(),
          leftAt: null,
          name: null,
          email: null,
        },
      ],
    });

    await expect(
      joinRoomByCode({
        code: "ABC123",
        userId: "player-3",
      }),
    ).rejects.toMatchObject({
      message: "Room is full",
      statusCode: 409,
    });
  });

  it("allows only the host to start a room match", async () => {
    vi.mocked(roomRepository.getRoomSnapshotById).mockResolvedValue(createRoomSnapshot());

    await expect(
      startRoomMatch({
        roomId: "room-1",
        userId: "player-2",
      }),
    ).rejects.toMatchObject({
      message: "Only host can start match",
      statusCode: 403,
    });
  });

  it("persists finished realtime match state and closes the room", async () => {
    vi.mocked(roomRepository.findMatchById).mockResolvedValue({
      id: "match-1",
      roomId: "room-1",
      snapshot: {},
      participants: [
        { userId: "host-1" },
        { userId: "player-2" },
      ],
    } as never);

    const snapshot: OnlineAuthoritativeSnapshot = {
      roomId: "room-1",
      matchId: "match-1",
      revision: 3,
      phase: "finished",
      currentRoll: null,
      seat1Board: [[6], [], []],
      seat2Board: [[1], [], []],
      seatScores: {
        seat1: 6,
        seat2: 1,
      },
      winner: "seat1" as const,
      turnUserId: null,
      players: {
        seat1: "host-1",
        seat2: "player-2",
      },
    };

    await saveRealtimeMatchState({
      roomId: "room-1",
      matchId: "match-1",
      snapshot,
      finished: true,
    });

    expect(roomRepository.updateMatchSnapshot).toHaveBeenCalledOnce();
    expect(matchesRepository.upsertMatchResultForUser).toHaveBeenCalledTimes(2);
    expect(roomRepository.closeRoomAfterMatchFinished).toHaveBeenCalledWith("room-1");
  });

  it("returns bootstrap snapshot only for matching room", async () => {
    const snapshot: OnlineAuthoritativeSnapshot = {
      roomId: "room-1",
      matchId: "match-1",
      revision: 1,
      phase: "player_turn",
      currentRoll: 2,
      seat1Board: [[], [], []],
      seat2Board: [[], [], []],
      seatScores: {
        seat1: 0,
        seat2: 0,
      },
      winner: null,
      turnUserId: "host-1",
      players: {
        seat1: "host-1",
        seat2: "player-2",
      },
    };
    vi.mocked(roomRepository.findMatchById).mockResolvedValue({
      id: "match-1",
      roomId: "room-1",
      snapshot,
      participants: [],
    } as never);

    await expect(
      getRealtimeBootstrapSnapshot({
        roomId: "room-2",
        matchId: "match-1",
      }),
    ).rejects.toMatchObject({
      message: "Match not found",
      statusCode: 404,
    });
  });
});
