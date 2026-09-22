import request from "supertest";
import { createApp } from "../../src/app";
import { readLoggedLines } from "../helpers/logSpy";

describe("request logger", () => {
  it("registra metodo, path, status, duracion y requestId", async () => {
    const write = jest.spyOn(process.stdout, "write").mockImplementation(() => true);

    const response = await request(createApp()).get("/health").expect(200);

    const lines = readLoggedLines(write);
    write.mockRestore();

    expect(lines).toContainEqual(
      expect.objectContaining({
        msg: "request completed",
        method: "GET",
        path: "/health",
        statusCode: 200,
        durationMs: expect.any(Number),
        requestId: response.headers["x-request-id"]
      })
    );
  });
});
