import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { parseCreateMatchResultRequest } from "@/server/matches/validation";
import { MatchServiceError, saveTrackedMatchResult } from "@/server/matches/service";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const parsedPayload = parseCreateMatchResultRequest(payload);

    await saveTrackedMatchResult({
      userId: user.id,
      payload: parsedPayload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MatchServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
