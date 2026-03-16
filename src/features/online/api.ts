export type RoomApiSnapshot = {
  room: {
    id: string;
    code: string;
    status: "WAITING" | "IN_GAME" | "CLOSED";
    hostId: string;
    createdAt: string;
  };
  members: Array<{
    userId: string;
    role: "HOST" | "PLAYER";
    joinedAt: string;
    leftAt: string | null;
    name: string | null;
    email: string | null;
  }>;
  currentMatchId: string | null;
};

export async function createRoom(): Promise<RoomApiSnapshot> {
  const response = await fetch("/api/rooms", { method: "POST" });
  const data = (await response.json().catch(() => null)) as { room?: RoomApiSnapshot; error?: string } | null;
  if (!response.ok || !data?.room) {
    throw new Error(data?.error ?? "Failed to create room");
  }
  return data.room;
}

export async function joinRoom(code: string): Promise<RoomApiSnapshot> {
  const response = await fetch(`/api/rooms/join/${code}`, {
    method: "POST",
  });
  const data = (await response.json().catch(() => null)) as { room?: RoomApiSnapshot; error?: string } | null;
  if (!response.ok || !data?.room) {
    throw new Error(data?.error ?? "Failed to join room");
  }
  return data.room;
}

export async function leaveRoom(roomId: string): Promise<RoomApiSnapshot> {
  const response = await fetch(`/api/rooms/${roomId}/leave`, { method: "POST" });
  const data = (await response.json().catch(() => null)) as { room?: RoomApiSnapshot; error?: string } | null;
  if (!response.ok || !data?.room) {
    throw new Error(data?.error ?? "Failed to leave room");
  }
  return data.room;
}

export async function startMatch(roomId: string): Promise<{
  matchId: string;
  room: RoomApiSnapshot;
}> {
  const response = await fetch(`/api/rooms/${roomId}/start`, { method: "POST" });
  const data = (await response.json().catch(() => null)) as
    | { room?: RoomApiSnapshot; matchId?: string; error?: string }
    | null;
  if (!response.ok || !data?.room || !data?.matchId) {
    throw new Error(data?.error ?? "Failed to start match");
  }
  return {
    room: data.room,
    matchId: data.matchId,
  };
}

export async function fetchRoom(roomId: string): Promise<RoomApiSnapshot> {
  const response = await fetch(`/api/rooms/${roomId}`, { method: "GET", cache: "no-store" });
  const data = (await response.json().catch(() => null)) as { room?: RoomApiSnapshot; error?: string } | null;
  if (!response.ok || !data?.room) {
    throw new Error(data?.error ?? "Failed to fetch room");
  }
  return data.room;
}

export async function fetchRealtimeRoomToken(roomId: string): Promise<{
  token: string;
  realtimeUrl: string;
}> {
  const response = await fetch(`/api/rooms/${roomId}/token`, { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as
    | { token?: string; realtimeUrl?: string; error?: string }
    | null;
  if (!response.ok || !data?.token || !data.realtimeUrl) {
    throw new Error(data?.error ?? "Failed to issue realtime token");
  }
  return {
    token: data.token,
    realtimeUrl: data.realtimeUrl,
  };
}
