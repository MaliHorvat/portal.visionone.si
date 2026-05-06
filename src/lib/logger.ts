type Level = "info" | "warn" | "error";

export function log(level: Level, event: string, context?: Record<string, unknown>) {
  const payload = {
    at: new Date().toISOString(),
    level,
    event,
    ...(context ? { context } : {}),
  };
  const line = `[portal] ${JSON.stringify(payload)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, context?: Record<string, unknown>) => log("info", event, context),
  warn: (event: string, context?: Record<string, unknown>) => log("warn", event, context),
  error: (event: string, context?: Record<string, unknown>) => log("error", event, context),
};
