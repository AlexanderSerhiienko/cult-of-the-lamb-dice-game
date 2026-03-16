import { MatchMode, MatchOutcome } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { CreateTrackedMatchResultInput } from "@/server/matches/types";

export async function upsertMatchResultForUser(params: {
  userId: string;
  input: CreateTrackedMatchResultInput;
}): Promise<void> {
  const { userId, input } = params;

  await prisma.matchResult.upsert({
    where: {
      userId_externalMatchId: {
        userId,
        externalMatchId: input.externalMatchId,
      },
    },
    update: {},
    create: {
      externalMatchId: input.externalMatchId,
      mode: input.mode === "bot" ? MatchMode.BOT : MatchMode.ONLINE,
      outcome:
        input.outcome === "win"
          ? MatchOutcome.WIN
          : input.outcome === "lose"
            ? MatchOutcome.LOSE
            : MatchOutcome.DRAW,
      playerScore: input.playerScore,
      opponentScore: input.opponentScore,
      userId,
    },
  });
}
