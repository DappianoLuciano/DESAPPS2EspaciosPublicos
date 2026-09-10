export type RuntimeMode = "development" | "test" | "production";

export function getRuntimeMode(): RuntimeMode {
  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  if (
    process.env.NODE_ENV === "development" ||
    (process.env.NODE_ENV === undefined && process.env.npm_lifecycle_event === "dev")
  ) {
    return "development";
  }

  // Unknown or missing runtime modes use the safest behaviour.
  return "production";
}

export function isProductionRuntime(): boolean {
  return getRuntimeMode() === "production";
}

export function isTestRuntime(): boolean {
  return getRuntimeMode() === "test";
}

export function getListenHost(): string | undefined {
  return getRuntimeMode() === "development" ? "127.0.0.1" : undefined;
}
