import { getRuntimeMode } from "../../../shared/runtime/runtimeMode";

export function isMockAuthEnabled(): boolean {
  return getRuntimeMode() !== "production";
}
