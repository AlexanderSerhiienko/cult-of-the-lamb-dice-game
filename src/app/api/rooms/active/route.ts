import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { findActiveMatchForUser } from "@/server/rooms/repository";

export async function GET() {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ activeMatch: null });
  }

  const activeMatch = await findActiveMatchForUser(user.id);
  return NextResponse.json({ activeMatch });
}
