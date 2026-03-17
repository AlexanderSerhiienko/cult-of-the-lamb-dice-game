export type TelemetrySink = {
  trackEvent: (eventName: string, fields?: Record<string, unknown>) => void;
  trackError: (eventName: string, fields?: Record<string, unknown>) => void;
  trackMetric: (metricName: string, value: number, tags?: Record<string, unknown>) => void;
};

export function createConsoleTelemetrySink(namespace?: string): TelemetrySink;
export function createNoopTelemetrySink(): TelemetrySink;
