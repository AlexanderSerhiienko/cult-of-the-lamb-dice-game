import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { RoomServiceError } from "@/server/rooms/service";
import { getRoomSnapshotById } from "@/server/rooms/repository";

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

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof RoomServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 });
  }
}
