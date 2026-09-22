/**
 * Parses the newline-delimited JSON lines written to stdout by pino
 * (our tests run outside "development", so the logger emits raw JSON,
 * not the pretty-printed format used in local dev).
 */
export function readLoggedLines(write: jest.SpyInstance): Record<string, unknown>[] {
  return write.mock.calls
    .map(([chunk]) => String(chunk).trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
