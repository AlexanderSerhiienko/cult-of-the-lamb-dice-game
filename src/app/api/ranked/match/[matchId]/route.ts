import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { MatchServiceError } from "@/server/matches/service";
import { getRankedMatchSession } from "@/server/ranked/service";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await params;

  try {
    const session = await getRankedMatchSession({
      userId: user.id,
      matchId,
    });

    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof MatchServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
