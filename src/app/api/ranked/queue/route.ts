import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/require-session";
import { getRankedProfile } from "@/server/ranked/service";

function getRealtimeUrl() {
  return process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4001";
}

function getRealtimeInternalSecret() {
  return process.env.REALTIME_INTERNAL_SECRET ?? "dev-realtime-internal-secret";
}

export async function POST() {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getRankedProfile({ userId: user.id });
    const response = await fetch(`${getRealtimeUrl()}/ranked/queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-realtime-internal-secret": getRealtimeInternalSecret(),
      },
      body: JSON.stringify({
        userId: user.id,
        mmr: profile.mmr,
      }),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as
      | { searching?: boolean; roomId?: string; matchId?: string; error?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json({ error: data?.error ?? "Failed to join ranked queue" }, { status: response.status });
    }

    return NextResponse.json({
      searching: Boolean(data?.searching),
      roomId: data?.roomId ?? null,
      matchId: data?.matchId ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join ranked queue" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${getRealtimeUrl()}/ranked/queue`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-realtime-internal-secret": getRealtimeInternalSecret(),
      },
      body: JSON.stringify({
        userId: user.id,
      }),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      return NextResponse.json({ error: data?.error ?? "Failed to leave ranked queue" }, { status: response.status });
    }

    return NextResponse.json({ searching: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to leave ranked queue" },
      { status: 500 },
    );
  }
}
