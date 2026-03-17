import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { MatchServiceError } from "@/server/matches/service";
import { getActiveRankedMatch } from "@/server/ranked/service";

export async function GET() {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ activeMatch: null });
  }

  try {
    const activeMatch = await getActiveRankedMatch({ userId: user.id });
    return NextResponse.json({ activeMatch });
  } catch (error) {
    if (error instanceof MatchServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
