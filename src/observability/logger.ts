type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const emit = (level: LogLevel, message: string, context?: LogContext) => {
  // Hook point: integrate Sentry/Datadog here without changing call sites.
  const payload = context ? { message, ...context } : { message };
  // eslint-disable-next-line no-console
  console[level](`[${level.toUpperCase()}] ${message}`, payload);
};

export const logInfo = (message: string, context?: LogContext) => emit("info", message, context);
export const logWarn = (message: string, context?: LogContext) => emit("warn", message, context);
export const logError = (message: string, context?: LogContext) => emit("error", message, context);
