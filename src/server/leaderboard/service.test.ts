import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/leaderboard/repository", () => ({
  findLeaderboardSource: vi.fn(),
}));

import { getLeaderboard } from "@/server/leaderboard/service";
import { MatchServiceError } from "@/server/matches/service";
import { REPORTED_MATCH_MODE, TRACKED_MATCH_MODE } from "@/server/matches/types";
import * as leaderboardRepository from "@/server/leaderboard/repository";

describe("leaderboard service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps bot mode to tracked bot mode", async () => {
    vi.mocked(leaderboardRepository.findLeaderboardSource).mockResolvedValue([]);

    await getLeaderboard({ mode: REPORTED_MATCH_MODE.BOT, limit: 10 });

    expect(leaderboardRepository.findLeaderboardSource).toHaveBeenCalledWith({
      mode: TRACKED_MATCH_MODE.BOT,
      limit: 10,
    });
  });

  it("maps online mode to tracked online mode", async () => {
    vi.mocked(leaderboardRepository.findLeaderboardSource).mockResolvedValue([]);

    await getLeaderboard({ mode: REPORTED_MATCH_MODE.ONLINE, limit: 5 });

    expect(leaderboardRepository.findLeaderboardSource).toHaveBeenCalledWith({
      mode: TRACKED_MATCH_MODE.ONLINE,
      limit: 5,
    });
  });

  it("rejects local mode", async () => {
    await expect(getLeaderboard({ mode: REPORTED_MATCH_MODE.LOCAL, limit: 5 })).rejects.toBeInstanceOf(
      MatchServiceError,
    );
  });
});
