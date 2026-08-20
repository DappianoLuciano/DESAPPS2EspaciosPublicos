import request from "supertest";
import { createApp } from "../../src/app";

describe("GET /health", () => {
  it("responde el estado del modulo", async () => {
    const app = createApp();

    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual({
      status: "ok",
      module: "espacios-publicos-cultura"
    });
  });
});
