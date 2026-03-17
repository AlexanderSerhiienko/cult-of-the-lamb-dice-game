export const RANKED_QUEUE_MMR_WINDOWS = [
  { maxWaitMs: 10_000, allowedGap: 100 },
  { maxWaitMs: 20_000, allowedGap: 200 },
  { maxWaitMs: Number.POSITIVE_INFINITY, allowedGap: 300 },
];

function getAllowedMmrGap(waitMs) {
  return RANKED_QUEUE_MMR_WINDOWS.find((window) => waitMs < window.maxWaitMs)?.allowedGap ?? 300;
}

export class RankedQueueManager {
  constructor() {
    this.entries = new Map();
  }

  enqueue(entry) {
    const existing = this.entries.get(entry.userId);
    const normalizedEntry = existing
      ? {
          ...existing,
          mmr: entry.mmr,
          socketId: entry.socketId ?? existing.socketId ?? null,
        }
      : {
          userId: entry.userId,
          mmr: entry.mmr,
          joinedAt: entry.joinedAt ?? Date.now(),
          socketId: entry.socketId ?? null,
        };

    this.entries.set(entry.userId, normalizedEntry);
    return normalizedEntry;
  }

  dequeue(userId) {
    const existing = this.entries.get(userId) ?? null;
    this.entries.delete(userId);
    return existing;
  }

  get(userId) {
    return this.entries.get(userId) ?? null;
  }

  size() {
    return this.entries.size;
  }

  attemptMatch(now = Date.now()) {
    const sortedEntries = [...this.entries.values()].sort((left, right) => left.joinedAt - right.joinedAt);

    for (let index = 0; index < sortedEntries.length; index += 1) {
      const first = sortedEntries[index];
      const waitMs = now - first.joinedAt;
      const allowedGap = getAllowedMmrGap(waitMs);

      for (let candidateIndex = index + 1; candidateIndex < sortedEntries.length; candidateIndex += 1) {
        const second = sortedEntries[candidateIndex];
        const mmrGap = Math.abs(first.mmr - second.mmr);
        if (mmrGap > allowedGap) {
          continue;
        }

        this.entries.delete(first.userId);
        this.entries.delete(second.userId);

        return {
          seat1: first,
          seat2: second,
        };
      }
    }

    return null;
  }
}
