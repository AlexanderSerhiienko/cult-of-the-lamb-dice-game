import { describe, expect, it } from "vitest";
import { parseCreateMatchResultRequest, parseLeaderboardQueryParams } from "@/server/matches/validation";

describe("parseCreateMatchResultRequest", () => {
  it("parses valid payload", () => {
    const payload = parseCreateMatchResultRequest({
      externalMatchId: "match-1",
      mode: "bot",
      outcome: "win",
      playerScore: 42,
      opponentScore: 31,
    });

    expect(payload).toEqual({
      externalMatchId: "match-1",
      mode: "bot",
      outcome: "win",
      playerScore: 42,
      opponentScore: 31,
    });
  });

  it("throws on invalid mode", () => {
    expect(() =>
      parseCreateMatchResultRequest({
        externalMatchId: "match-1",
        mode: "pvp",
        outcome: "win",
        playerScore: 1,
        opponentScore: 0,
      }),
    ).toThrowError("Invalid match mode");
  });

  it("throws on malformed externalMatchId", () => {
    expect(() =>
      parseCreateMatchResultRequest({
        externalMatchId: "x",
        mode: "bot",
        outcome: "win",
        playerScore: 1,
        opponentScore: 0,
      }),
    ).toThrowError("Invalid externalMatchId");
  });

  it("throws when score exceeds game bounds", () => {
    expect(() =>
      parseCreateMatchResultRequest({
        externalMatchId: "match-123",
        mode: "bot",
        outcome: "win",
        playerScore: 200,
        opponentScore: 0,
      }),
    ).toThrowError("Invalid playerScore");
  });
});

describe("parseLeaderboardQueryParams", () => {
  it("uses defaults for empty query", () => {
    const params = new URLSearchParams();
    expect(parseLeaderboardQueryParams(params)).toEqual({
      mode: "bot",
      limit: 20,
    });
  });

  it("sanitizes limit to allowed range", () => {
    const params = new URLSearchParams("mode=online&limit=500");
    expect(parseLeaderboardQueryParams(params)).toEqual({
      mode: "online",
      limit: 100,
    });
  });
});
