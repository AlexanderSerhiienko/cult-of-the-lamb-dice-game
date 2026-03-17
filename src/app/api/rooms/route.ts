import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { createRoomForUser, RoomServiceError } from "@/server/rooms/service";

export async function POST() {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limiter = await consumeRateLimit({
    key: `rooms:create:${user.id}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "Too many create room requests" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfterSec) } },
    );
  }

  try {
    const room = await createRoomForUser(user.id);
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    if (error instanceof RoomServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
