import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { MatchServiceError } from "@/server/matches/service";
import { getRankedProfile } from "@/server/ranked/service";

export async function GET() {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getRankedProfile({ userId: user.id });
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof MatchServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
