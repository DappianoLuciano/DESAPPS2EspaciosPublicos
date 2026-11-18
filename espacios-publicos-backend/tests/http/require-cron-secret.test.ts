import { NextFunction, Request, Response } from "express";
import { requireCronSecret } from "../../src/interfaces/http/middlewares/requireCronSecret";

function run(authorization: string | undefined): unknown {
  const next = jest.fn() as jest.MockedFunction<NextFunction>;
  const request = { header: (name: string) => (name === "authorization" ? authorization : undefined) } as Request;
  requireCronSecret(request, {} as Response, next);
  expect(next).toHaveBeenCalledTimes(1);
  return next.mock.calls[0][0];
}

describe("requireCronSecret", () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "secreto-del-cron";
  });

  afterAll(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("deja pasar el secreto correcto", () => {
    expect(run("Bearer secreto-del-cron")).toBeUndefined();
  });

  it("rechaza con 401 un secreto incorrecto o ausente", () => {
    expect(run("Bearer otro-secreto")).toMatchObject({ statusCode: 401 });
    expect(run(undefined)).toMatchObject({ statusCode: 401 });
  });

  // Mismo largo en caracteres que el esperado pero mas bytes: antes timingSafeEqual tiraba y salia un 500.
  it("rechaza con 401, sin excepcion, un header con caracteres multibyte", () => {
    const sameLengthMultibyte = "Bearer " + "ñ".repeat("secreto-del-cron".length);
    expect(run(sameLengthMultibyte)).toMatchObject({ statusCode: 401 });
  });

  it("responde 503 si el ciclo programado no esta configurado", () => {
    delete process.env.CRON_SECRET;
    expect(run("Bearer secreto-del-cron")).toMatchObject({ statusCode: 503 });
  });
});
