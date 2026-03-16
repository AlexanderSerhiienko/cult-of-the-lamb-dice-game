import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { getRoomSnapshotById } from "@/server/rooms/repository";
import { signRealtimeRoomToken } from "@/server/rooms/realtime-token";
import { RoomServiceError } from "@/server/rooms/service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const room = await getRoomSnapshotById(id);
    if (!room) {
      throw new RoomServiceError("Room not found", 404);
    }
    const isMember = room.members.some((member) => member.userId === user.id && member.leftAt === null);
    if (!isMember) {
      throw new RoomServiceError("Forbidden", 403);
    }

    const token = signRealtimeRoomToken({
      sub: user.id,
      roomId: id,
    });
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4001";

    return NextResponse.json({ token, realtimeUrl });
  } catch (error) {
    if (error instanceof RoomServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Failed to issue room token" }, { status: 500 });
  }
}
