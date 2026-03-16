import { NextResponse } from "next/server";
import { requireRealtimeInternal } from "@/server/auth/require-realtime-internal";
import type { OnlineAuthoritativeSnapshot } from "@/server/rooms/authoritative-engine";
import { RoomServiceError, saveRealtimeMatchState } from "@/server/rooms/service";

type MatchStatePayload = {
  roomId?: string;
  matchId?: string;
  snapshot?: OnlineAuthoritativeSnapshot;
  finished?: boolean;
};

export async function POST(request: Request) {
  if (!requireRealtimeInternal(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as MatchStatePayload | null;
  const roomId = payload?.roomId;
  const matchId = payload?.matchId;
  const snapshot = payload?.snapshot;
  const finished = Boolean(payload?.finished);

  if (!roomId || !matchId || !snapshot) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await saveRealtimeMatchState({
      roomId,
      matchId,
      snapshot,
      finished,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RoomServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to persist match state" }, { status: 500 });
  }
}

