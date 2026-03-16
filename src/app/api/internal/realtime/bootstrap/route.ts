import { NextResponse } from "next/server";
import { requireRealtimeInternal } from "@/server/auth/require-realtime-internal";
import { getRealtimeBootstrapSnapshot, RoomServiceError } from "@/server/rooms/service";

type BootstrapPayload = {
  roomId?: string;
  matchId?: string;
};

export async function POST(request: Request) {
  if (!requireRealtimeInternal(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as BootstrapPayload | null;
  const roomId = payload?.roomId;
  const matchId = payload?.matchId;
  if (!roomId || !matchId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const snapshot = await getRealtimeBootstrapSnapshot({ roomId, matchId });
    return NextResponse.json({
      snapshot,
      revision: snapshot.revision,
    });
  } catch (error) {
    if (error instanceof RoomServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to bootstrap match" }, { status: 500 });
  }
}

