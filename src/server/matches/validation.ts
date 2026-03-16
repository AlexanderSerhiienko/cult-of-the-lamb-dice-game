import { MATCH_OUTCOME, REPORTED_MATCH_MODE } from "@/server/matches/types";
import type { CreateMatchResultRequest, ReportedMatchMode } from "@/server/matches/types";

const EXTERNAL_MATCH_ID_PATTERN = /^[A-Za-z0-9:_-]{6,128}$/;
const MAX_MATCH_SCORE = 162;

function isReportedMode(value: unknown): value is ReportedMatchMode {
  return (
    value === REPORTED_MATCH_MODE.BOT ||
    value === REPORTED_MATCH_MODE.ONLINE ||
    value === REPORTED_MATCH_MODE.LOCAL
  );
}

function isOutcome(value: unknown): value is CreateMatchResultRequest["outcome"] {
  return value === MATCH_OUTCOME.WIN || value === MATCH_OUTCOME.LOSE || value === MATCH_OUTCOME.DRAW;
}

export function parseCreateMatchResultRequest(payload: unknown): CreateMatchResultRequest {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }

  const {
    externalMatchId,
    mode,
    outcome,
    playerScore,
    opponentScore,
  } = payload as Partial<CreateMatchResultRequest>;

  if (typeof externalMatchId !== "string" || !EXTERNAL_MATCH_ID_PATTERN.test(externalMatchId)) {
    throw new Error("Invalid externalMatchId");
  }

  if (!isReportedMode(mode)) {
    throw new Error("Invalid match mode");
  }

  if (!isOutcome(outcome)) {
    throw new Error("Invalid match outcome");
  }

  if (
    typeof playerScore !== "number" ||
    !Number.isInteger(playerScore) ||
    playerScore < 0 ||
    playerScore > MAX_MATCH_SCORE
  ) {
    throw new Error("Invalid playerScore");
  }

  if (
    typeof opponentScore !== "number" ||
    !Number.isInteger(opponentScore) ||
    opponentScore < 0 ||
    opponentScore > MAX_MATCH_SCORE
  ) {
    throw new Error("Invalid opponentScore");
  }

  return {
    externalMatchId,
    mode,
    outcome,
    playerScore,
    opponentScore,
  };
}

export function parseLeaderboardQueryParams(params: URLSearchParams): {
  mode: ReportedMatchMode;
  limit: number;
} {
  const modeRaw = params.get("mode");
  const limitRaw = params.get("limit");

  const mode = isReportedMode(modeRaw) ? modeRaw : REPORTED_MATCH_MODE.BOT;
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
  const limit = Number.isNaN(parsedLimit) ? 20 : Math.min(Math.max(parsedLimit, 1), 100);

  return { mode, limit };
}
