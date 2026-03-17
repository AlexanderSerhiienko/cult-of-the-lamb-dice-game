function emit(level, eventName, payload) {
  const method = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  method("[telemetry]", {
    level,
    eventName,
    ...payload,
  });
}

export function createConsoleTelemetrySink(namespace = "app") {
  return {
    trackEvent(eventName, fields = {}) {
      emit("info", `${namespace}.${eventName}`, fields);
    },
    trackError(eventName, fields = {}) {
      emit("error", `${namespace}.${eventName}`, fields);
    },
    trackMetric(metricName, value, tags = {}) {
      emit("info", `${namespace}.${metricName}`, {
        metric: true,
        value,
        tags,
      });
    },
  };
}

export function createNoopTelemetrySink() {
  return {
    trackEvent() {},
    trackError() {},
    trackMetric() {},
  };
}
