function percentile(values, ratio) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
  return sorted[index];
}

export class LatencyMetrics {
  constructor(name, flushEvery = 20) {
    this.name = name;
    this.flushEvery = flushEvery;
    this.values = [];
  }

  push(valueMs, extra = {}) {
    this.values.push(valueMs);
    if (this.values.length >= this.flushEvery) {
      const p50 = percentile(this.values, 0.5);
      const p95 = percentile(this.values, 0.95);
      console.info("[realtime:metrics]", {
        metric: this.name,
        count: this.values.length,
        p50,
        p95,
        ...extra,
      });
      this.values = [];
    }
  }
}

