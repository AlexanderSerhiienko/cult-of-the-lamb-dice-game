import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { joinRoomByCode, RoomServiceError } from "@/server/rooms/service";

type Params = {
  params: Promise<{ code: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limiter = await consumeRateLimit({
    key: `rooms:join:${user.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "Too many join requests" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfterSec) } },
    );
  }

  const { code } = await params;

  try {
    const room = await joinRoomByCode({
      code: code.toUpperCase(),
      userId: user.id,
    });

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof RoomServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}
