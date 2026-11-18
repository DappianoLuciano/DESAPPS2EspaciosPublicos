import { computeIntegrationMetrics, metricsSince, moduleOf } from "../../src/application/integrations/integrationMetrics";
import { OutboxDelivery } from "../../src/domain/repositories/IntegrationStatusRepository";

// 12/11/2026 15:00 en Buenos Aires.
const now = new Date("2026-11-12T18:00:00.000Z");
const ago = (hours: number) => new Date(now.getTime() - hours * 3600_000);

function delivery(overrides: Partial<OutboxDelivery>): OutboxDelivery {
  return { status: "PUBLISHED", attempts: 0, createdAt: ago(1), publishedAt: ago(1), ...overrides };
}

describe("computeIntegrationMetrics", () => {
  it("calcula entrega, latencia y reintentos sobre los eventos generados en la ultima semana", () => {
    const createdAt = ago(10);
    const metrics = computeIntegrationMetrics({
      now,
      deliveries: [
        delivery({ createdAt, publishedAt: new Date(createdAt.getTime() + 1_000) }),
        delivery({ createdAt, publishedAt: new Date(createdAt.getTime() + 2_000) }),
        // Fallo una vez y lo rescato el worker del outbox dos minutos despues.
        delivery({ createdAt, publishedAt: new Date(createdAt.getTime() + 120_000), attempts: 1 }),
        delivery({ status: "FAILED", attempts: 5, createdAt, publishedAt: null }),
        delivery({ status: "PENDING", attempts: 2, createdAt, publishedAt: null }),
        // Fuera de la ventana: no cuenta para la entrega, si para la semana anterior.
        delivery({ createdAt: ago(24 * 9), publishedAt: ago(24 * 9) })
      ],
      arrivals: [],
      recommendations: []
    });

    expect(metrics.delivery).toEqual({ rate: 0.75, published: 3, failed: 1, pending: 1, recoveredByRetry: 1 });
    expect(metrics.latencySeconds).toEqual({ median: 2, p95: 120 });
    expect(metrics.published).toEqual({ current: 3, previous: 1 });
  });

  it("sin eventos terminados no inventa una tasa ni una latencia", () => {
    const metrics = computeIntegrationMetrics({ now, deliveries: [], arrivals: [], recommendations: [] });

    expect(metrics.delivery.rate).toBeNull();
    expect(metrics.latencySeconds).toEqual({ median: null, p95: null });
    expect(metrics.mobility.coverage).toBeNull();
  });

  it("cuenta lo recibido por modulo y lo compara con la semana anterior", () => {
    const metrics = computeIntegrationMetrics({
      now,
      deliveries: [],
      arrivals: [
        { eventType: "com.citypass.movilidad.RecomendacionDestinoActualizada", receivedAt: ago(2) },
        { eventType: "com.citypass.movilidad.RecomendacionDestinoActualizada", receivedAt: ago(30) },
        { eventType: "com.citypass.reclamos.ReclamoCreado.v3", receivedAt: ago(5) },
        { eventType: "com.citypass.emergencias.EmergenciaCreada", receivedAt: ago(24 * 10) }
      ],
      recommendations: []
    });

    expect(metrics.received).toEqual({ current: 3, previous: 1 });
    expect(metrics.receivedByModule).toEqual([{ module: "movilidad", count: 2 }, { module: "reclamos", count: 1 }]);
  });

  it("mide cuantos eventos proximos tienen estacion de Movilidad y cuantas estan al dia", () => {
    const metrics = computeIntegrationMetrics({
      now,
      deliveries: [],
      arrivals: [],
      recommendations: [ago(1), ago(51), null, null]
    });

    expect(metrics.mobility).toEqual({ upcoming: 4, withRecommendation: 2, fresh: 1, coverage: 0.5 });
  });

  it("arma 14 dias corridos con el dia de Buenos Aires, hoy al final", () => {
    const metrics = computeIntegrationMetrics({
      now,
      deliveries: [
        // 12/11 00:30 en Buenos Aires (03:30 UTC): es hoy, no ayer.
        delivery({ createdAt: new Date("2026-11-12T03:30:00.000Z"), publishedAt: new Date("2026-11-12T03:30:00.000Z") }),
        // 11/11 23:30 en Buenos Aires (12/11 02:30 UTC): es ayer.
        delivery({ createdAt: new Date("2026-11-12T02:30:00.000Z"), publishedAt: new Date("2026-11-12T02:30:00.000Z") })
      ],
      arrivals: [{ eventType: "com.citypass.reclamos.ReclamoCreado", receivedAt: new Date("2026-10-30T15:00:00.000Z") }],
      recommendations: []
    });

    expect(metrics.daily).toHaveLength(14);
    expect(metrics.daily[0]).toEqual({ date: "2026-10-30", published: 0, received: 1 });
    expect(metrics.daily[12]).toEqual({ date: "2026-11-11", published: 1, received: 0 });
    expect(metrics.daily[13]).toEqual({ date: "2026-11-12", published: 1, received: 0 });
  });

  it("pide los datos desde el inicio del dia de hace 13 dias (dos ventanas de 7)", () => {
    expect(metricsSince(now).toISOString()).toBe("2026-10-30T03:00:00.000Z");
  });

  it("saca el modulo del nombre del evento", () => {
    expect(moduleOf("com.citypass.reclamos.ReclamoCreado.v3")).toBe("reclamos");
    expect(moduleOf("raro")).toBe("raro");
  });
});
