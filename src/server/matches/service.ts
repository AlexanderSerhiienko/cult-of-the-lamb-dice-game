import { MATCH_OUTCOME, REPORTED_MATCH_MODE, TRACKED_MATCH_MODE } from "@/server/matches/types";
import { upsertMatchResultForUser } from "@/server/matches/repository";
import type { CreateMatchResultRequest, CreateTrackedMatchResultInput } from "@/server/matches/types";

export class MatchServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "MatchServiceError";
    this.statusCode = statusCode;
  }
}

function toTrackedMatchInput(input: CreateMatchResultRequest): CreateTrackedMatchResultInput {
  if (input.mode === REPORTED_MATCH_MODE.LOCAL) {
    throw new MatchServiceError("Local mode is not tracked", 400);
  }

  return {
    ...input,
    mode: input.mode === REPORTED_MATCH_MODE.BOT ? TRACKED_MATCH_MODE.BOT : TRACKED_MATCH_MODE.ONLINE,
  };
}

function deriveOutcomeFromScores(playerScore: number, opponentScore: number) {
  if (playerScore > opponentScore) {
    return MATCH_OUTCOME.WIN;
  }

  if (playerScore < opponentScore) {
    return MATCH_OUTCOME.LOSE;
  }

  return MATCH_OUTCOME.DRAW;
}

export async function saveTrackedMatchResult(params: {
  userId: string;
  payload: CreateMatchResultRequest;
}): Promise<void> {
  const { userId, payload } = params;
  const trackedInput = toTrackedMatchInput(payload);

  if (!userId) {
    throw new MatchServiceError("Unauthorized", 401);
  }

  const derivedOutcome = deriveOutcomeFromScores(trackedInput.playerScore, trackedInput.opponentScore);
  if (trackedInput.outcome !== derivedOutcome) {
    throw new MatchServiceError("Outcome does not match scores", 400);
  }

  await upsertMatchResultForUser({
    userId,
    input: trackedInput,
  });
}
