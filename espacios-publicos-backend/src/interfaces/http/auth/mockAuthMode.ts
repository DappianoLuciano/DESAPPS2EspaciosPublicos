import { getRuntimeMode } from "../../../shared/runtime/runtimeMode";

export function isMockAuthEnabled(): boolean {
  if (process.env.ALLOW_MOCK_AUTH === "true") {
    return true;
  }

  return getRuntimeMode() !== "production";
}
