import { NextResponse } from "next/server";
import { requireRealtimeInternal } from "@/server/auth/require-realtime-internal";
import { hasUserLeftRoom } from "@/server/rooms/repository";

type MemberStatePayload = {
  roomId?: string;
  userId?: string;
};

export async function POST(request: Request) {
  if (!requireRealtimeInternal(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as MemberStatePayload | null;
  const roomId = payload?.roomId;
  const userId = payload?.userId;

  if (!roomId || !userId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const left = await hasUserLeftRoom({ roomId, userId });
  return NextResponse.json({ left });
}

