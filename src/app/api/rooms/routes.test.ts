import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/require-session", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/server/security/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
}));

vi.mock("@/server/rooms/service", async () => {
  const actual = await vi.importActual<typeof import("@/server/rooms/service")>("@/server/rooms/service");

  return {
    ...actual,
    createRoomForUser: vi.fn(),
    joinRoomByCode: vi.fn(),
    leaveRoom: vi.fn(),
    startRoomMatch: vi.fn(),
  };
});

vi.mock("@/server/rooms/repository", () => ({
  getRoomSnapshotById: vi.fn(),
  findActiveMatchForUser: vi.fn(),
}));

vi.mock("@/server/rooms/realtime-token", () => ({
  signRealtimeRoomToken: vi.fn(),
}));

import { GET as getActiveMatch } from "@/app/api/rooms/active/route";
import { POST as createRoom } from "@/app/api/rooms/route";
import { POST as joinRoom } from "@/app/api/rooms/join/[code]/route";
import { GET as getRoom } from "@/app/api/rooms/[id]/route";
import { POST as leaveRoomRoute } from "@/app/api/rooms/[id]/leave/route";
import { POST as startRoom } from "@/app/api/rooms/[id]/start/route";
import { GET as getToken } from "@/app/api/rooms/[id]/token/route";
import { requireSessionUser } from "@/server/auth/require-session";
import { consumeRateLimit } from "@/server/security/rate-limit";
import {
  createRoomForUser,
  joinRoomByCode,
  leaveRoom,
  RoomServiceError,
  startRoomMatch,
} from "@/server/rooms/service";
import { findActiveMatchForUser, getRoomSnapshotById } from "@/server/rooms/repository";
import { signRealtimeRoomToken } from "@/server/rooms/realtime-token";

const mockUser = {
  id: "user-1",
  email: "user@example.com",
  role: "USER",
};

const roomSnapshot = {
  room: {
    id: "room-1",
    code: "ABC123",
    status: "WAITING",
    hostId: "user-1",
    createdAt: new Date("2026-03-16T10:00:00Z"),
  },
  currentMatchId: null,
  members: [
    {
      userId: "user-1",
      role: "HOST",
      joinedAt: new Date("2026-03-16T10:00:00Z"),
      leftAt: null,
      name: "User",
      email: "user@example.com",
    },
  ],
};

const serializedRoomSnapshot = {
  ...roomSnapshot,
  room: {
    ...roomSnapshot.room,
    createdAt: roomSnapshot.room.createdAt.toISOString(),
  },
  members: roomSnapshot.members.map((member) => ({
    ...member,
    joinedAt: member.joinedAt.toISOString(),
  })),
};

describe("rooms api routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(requireSessionUser).mockResolvedValue(mockUser as never);
    vi.mocked(consumeRateLimit).mockResolvedValue({
      ok: true,
      retryAfterSec: 60,
    });
    process.env.NEXT_PUBLIC_REALTIME_URL = "http://localhost:4001";
  });

  it("creates room when authenticated and rate limit allows", async () => {
    vi.mocked(createRoomForUser).mockResolvedValue(roomSnapshot as never);

    const response = await createRoom();

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ room: serializedRoomSnapshot });
  });

  it("returns 429 when create room rate limit is exceeded", async () => {
    vi.mocked(consumeRateLimit).mockResolvedValue({
      ok: false,
      retryAfterSec: 12,
    });

    const response = await createRoom();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
  });

  it("joins room with uppercased code", async () => {
    vi.mocked(joinRoomByCode).mockResolvedValue(roomSnapshot as never);

    const response = await joinRoom(new Request("http://localhost"), {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(joinRoomByCode).toHaveBeenCalledWith({
      code: "ABC123",
      userId: "user-1",
    });
    expect(response.status).toBe(200);
  });

  it("returns room only to active members", async () => {
    vi.mocked(getRoomSnapshotById).mockResolvedValue(roomSnapshot as never);

    const response = await getRoom(new Request("http://localhost"), {
      params: Promise.resolve({ id: "room-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ room: serializedRoomSnapshot });
  });

  it("forbids room read for non-members", async () => {
    vi.mocked(getRoomSnapshotById).mockResolvedValue({
      ...roomSnapshot,
      members: [
        {
          ...roomSnapshot.members[0],
          userId: "other-user",
        },
      ],
    } as never);

    const response = await getRoom(new Request("http://localhost"), {
      params: Promise.resolve({ id: "room-1" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("leaves room through service", async () => {
    vi.mocked(leaveRoom).mockResolvedValue(roomSnapshot as never);

    const response = await leaveRoomRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id: "room-1" }),
    });

    expect(leaveRoom).toHaveBeenCalledWith({
      roomId: "room-1",
      userId: "user-1",
    });
    expect(response.status).toBe(200);
  });

  it("starts room match through service", async () => {
    vi.mocked(startRoomMatch).mockResolvedValue({
      room: roomSnapshot,
      matchId: "match-1",
      snapshot: {
        roomId: "room-1",
        matchId: "match-1",
        revision: 1,
        phase: "player_turn",
        currentRoll: 2,
        playerBoard: [[], [], []],
        botBoard: [[], [], []],
        scores: { player: 0, bot: 0 },
        winner: null,
        turnUserId: "user-1",
        players: { seat1: "user-1", seat2: "user-2" },
      },
    } as never);

    const response = await startRoom(new Request("http://localhost"), {
      params: Promise.resolve({ id: "room-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      matchId: "match-1",
      room: serializedRoomSnapshot,
    });
  });

  it("returns realtime token only to active room members", async () => {
    vi.mocked(getRoomSnapshotById).mockResolvedValue(roomSnapshot as never);
    vi.mocked(signRealtimeRoomToken).mockReturnValue("signed-token");

    const response = await getToken(new Request("http://localhost"), {
      params: Promise.resolve({ id: "room-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      token: "signed-token",
      realtimeUrl: "http://localhost:4001",
    });
  });

  it("returns active match for authenticated user", async () => {
    vi.mocked(findActiveMatchForUser).mockResolvedValue({
      roomId: "room-1",
      matchId: "match-1",
      reconnectDeadlineMs: 123456,
    });

    const response = await getActiveMatch();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      activeMatch: {
        roomId: "room-1",
        matchId: "match-1",
        reconnectDeadlineMs: 123456,
      },
    });
  });

  it("maps room service errors to response status", async () => {
    vi.mocked(createRoomForUser).mockRejectedValue(new RoomServiceError("boom", 409));

    const response = await createRoom();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "boom" });
  });
});
