import { NextResponse } from "next/server";
import { getLeaderboard } from "@/server/leaderboard/service";
import { parseLeaderboardQueryParams } from "@/server/matches/validation";
import { MatchServiceError } from "@/server/matches/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { mode, limit } = parseLeaderboardQueryParams(url.searchParams);

  try {
    const leaderboard = await getLeaderboard({ mode, limit });
    return NextResponse.json({ mode, entries: leaderboard });
  } catch (error) {
    if (error instanceof MatchServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
