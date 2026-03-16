import { NextResponse } from "next/server";
import { requireRealtimeInternal } from "@/server/auth/require-realtime-internal";
import { findCurrentMatchIdByRoomId } from "@/server/rooms/repository";

type CurrentMatchPayload = {
  roomId?: string;
};

export async function POST(request: Request) {
  if (!requireRealtimeInternal(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as CurrentMatchPayload | null;
  const roomId = payload?.roomId;
  if (!roomId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const matchId = await findCurrentMatchIdByRoomId(roomId);
  return NextResponse.json({ matchId });
}

