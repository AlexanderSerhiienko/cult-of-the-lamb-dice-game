import { NextResponse } from "next/server";
import { requireRealtimeInternal } from "@/server/auth/require-realtime-internal";
import { MatchServiceError } from "@/server/matches/service";
import { createRankedMatch } from "@/server/ranked/service";

type RankedMatchPayload = {
  seat1UserId?: string;
  seat2UserId?: string;
};

export async function POST(request: Request) {
  if (!requireRealtimeInternal(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as RankedMatchPayload | null;

  try {
    const result = await createRankedMatch({
      seat1UserId: payload?.seat1UserId ?? "",
      seat2UserId: payload?.seat2UserId ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MatchServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Failed to create ranked match" }, { status: 500 });
  }
}
