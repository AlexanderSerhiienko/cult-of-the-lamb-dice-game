import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveTrackedMatchResult } from "@/server/matches/service";
import * as repository from "@/server/matches/repository";

describe("saveTrackedMatchResult", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects local mode", async () => {
    await expect(
      saveTrackedMatchResult({
        userId: "user-1",
        payload: {
          externalMatchId: "match-1",
          mode: "local",
          outcome: "win",
          playerScore: 10,
          opponentScore: 8,
        },
      }),
    ).rejects.toThrowError("Local mode is not tracked");
  });

  it("rejects outcome that does not match scores", async () => {
    await expect(
      saveTrackedMatchResult({
        userId: "user-1",
        payload: {
          externalMatchId: "match-2",
          mode: "bot",
          outcome: "lose",
          playerScore: 12,
          opponentScore: 8,
        },
      }),
    ).rejects.toThrowError("Outcome does not match scores");
  });

  it("stores valid tracked match", async () => {
    const upsertSpy = vi.spyOn(repository, "upsertMatchResultForUser").mockResolvedValue(undefined);

    await saveTrackedMatchResult({
      userId: "user-1",
      payload: {
        externalMatchId: "match-3",
        mode: "bot",
        outcome: "win",
        playerScore: 12,
        opponentScore: 8,
      },
    });

    expect(upsertSpy).toHaveBeenCalledOnce();
  });
});
