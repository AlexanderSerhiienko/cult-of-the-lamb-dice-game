import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { leaveRoom, RoomServiceError } from "@/server/rooms/service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const room = await leaveRoom({
      roomId: id,
      userId: user.id,
    });
    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof RoomServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
  }
}
