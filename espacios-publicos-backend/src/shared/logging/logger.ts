import pino from "pino";
import { getRuntimeMode } from "../runtime/runtimeMode";

const level = process.env.LOG_LEVEL || "info";

export const logger = pino({
  level,
  ...(getRuntimeMode() === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname"
          }
        }
      }
    : {})
});
