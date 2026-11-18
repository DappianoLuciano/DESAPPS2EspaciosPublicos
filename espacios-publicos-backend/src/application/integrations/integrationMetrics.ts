import { InboundArrival, OutboxDelivery } from "../../domain/repositories/IntegrationStatusRepository";

/** Ventana de los indicadores y del grafico diario. */
export const METRICS_WINDOW_DAYS = 7;
export const METRICS_DAILY_DAYS = 14;
/** Una recomendacion de Movilidad mas vieja que esto se considera desactualizada. */
export const FRESH_RECOMMENDATION_HOURS = 24;

const DAY_MS = 24 * 3600_000;
// Argentina no tiene horario de verano: los dias del grafico se cortan a medianoche de Buenos Aires.
const BUENOS_AIRES_OFFSET_MS = -3 * 3600_000;

export interface WindowCount {
  /** Ultimos METRICS_WINDOW_DAYS dias. */
  current: number;
  /** Los METRICS_WINDOW_DAYS dias anteriores, para comparar. */
  previous: number;
}

export interface IntegrationMetrics {
  windowDays: number;
  /** Eventos que llegaron al bus (por fecha de publicacion). */
  published: WindowCount;
  /** Eventos de otros modulos que procesamos (sin duplicados: el webhook es idempotente). */
  received: WindowCount;
  /** Sobre los eventos generados en la ventana. */
  delivery: {
    /** publicados / (publicados + fallidos); null si no hubo ninguno terminado. */
    rate: number | null;
    published: number;
    failed: number;
    pending: number;
    /** Publicados que fallaron al menos una vez y los rescato el reintento del outbox. */
    recoveredByRetry: number;
  };
  /** Desde que se genera el evento hasta que el gateway lo acepta. */
  latencySeconds: { median: number | null; p95: number | null };
  receivedByModule: Array<{ module: string; count: number }>;
  /** Eventos proximos con estacion de bici calculada por Movilidad. */
  mobility: { upcoming: number; withRecommendation: number; fresh: number; coverage: number | null };
  daily: Array<{ date: string; published: number; received: number }>;
}

export interface MetricsInput {
  now: Date;
  /** Filas del outbox creadas desde 2 ventanas atras (o publicadas en ese rango). */
  deliveries: OutboxDelivery[];
  arrivals: InboundArrival[];
  /** calculadaEn de la recomendacion de cada evento proximo (null: sin recomendacion). */
  recommendations: Array<Date | null>;
}

/** Inicio del rango que necesitan los indicadores (dos ventanas o el grafico, lo que sea mas largo). */
export function metricsSince(now: Date): Date {
  const days = Math.max(2 * METRICS_WINDOW_DAYS, METRICS_DAILY_DAYS);
  return new Date(startOfLocalDay(now.getTime()) - (days - 1) * DAY_MS);
}

export function computeIntegrationMetrics({ now, deliveries, arrivals, recommendations }: MetricsInput): IntegrationMetrics {
  const nowMs = now.getTime();
  const windowStart = nowMs - METRICS_WINDOW_DAYS * DAY_MS;
  const previousStart = windowStart - METRICS_WINDOW_DAYS * DAY_MS;
  const inWindow = (ms: number) => ms > windowStart && ms <= nowMs;
  const inPrevious = (ms: number) => ms > previousStart && ms <= windowStart;

  const publishedTimes = deliveries
    .filter((row) => row.status === "PUBLISHED" && row.publishedAt)
    .map((row) => row.publishedAt!.getTime());
  const receivedTimes = arrivals.map((row) => row.receivedAt.getTime());

  const created = deliveries.filter((row) => inWindow(row.createdAt.getTime()));
  const delivered = created.filter((row) => row.status === "PUBLISHED");
  const failed = created.filter((row) => row.status === "FAILED").length;
  const finished = delivered.length + failed;

  const latencies = delivered
    .filter((row) => row.publishedAt)
    .map((row) => Math.max(0, (row.publishedAt!.getTime() - row.createdAt.getTime()) / 1000))
    .sort((a, b) => a - b);

  const byModule = new Map<string, number>();
  for (const arrival of arrivals) {
    if (!inWindow(arrival.receivedAt.getTime())) continue;
    const module = moduleOf(arrival.eventType);
    byModule.set(module, (byModule.get(module) ?? 0) + 1);
  }

  const withRecommendation = recommendations.filter((date): date is Date => date !== null);
  const fresh = withRecommendation.filter((date) => nowMs - date.getTime() <= FRESH_RECOMMENDATION_HOURS * 3600_000).length;

  return {
    windowDays: METRICS_WINDOW_DAYS,
    published: { current: publishedTimes.filter(inWindow).length, previous: publishedTimes.filter(inPrevious).length },
    received: { current: receivedTimes.filter(inWindow).length, previous: receivedTimes.filter(inPrevious).length },
    delivery: {
      rate: finished ? delivered.length / finished : null,
      published: delivered.length,
      failed,
      pending: created.filter((row) => row.status === "PENDING").length,
      recoveredByRetry: delivered.filter((row) => row.attempts > 0).length
    },
    latencySeconds: { median: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) },
    receivedByModule: [...byModule.entries()]
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count || a.module.localeCompare(b.module)),
    mobility: {
      upcoming: recommendations.length,
      withRecommendation: withRecommendation.length,
      fresh,
      coverage: recommendations.length ? withRecommendation.length / recommendations.length : null
    },
    daily: dailySeries(nowMs, publishedTimes, receivedTimes)
  };
}

/** "com.citypass.movilidad.RecomendacionDestinoActualizada" -> "movilidad". */
export function moduleOf(eventType: string): string {
  const parts = eventType.split(".");
  return parts.length > 2 ? parts[2] : eventType;
}

/** Percentil por rango mas cercano sobre una lista ya ordenada. */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return Math.round(sorted[index] * 10) / 10;
}

function startOfLocalDay(ms: number): number {
  return Math.floor((ms + BUENOS_AIRES_OFFSET_MS) / DAY_MS) * DAY_MS - BUENOS_AIRES_OFFSET_MS;
}

function localDate(ms: number): string {
  return new Date(ms + BUENOS_AIRES_OFFSET_MS).toISOString().slice(0, 10);
}

function dailySeries(nowMs: number, published: number[], received: number[]) {
  const today = startOfLocalDay(nowMs);
  const days = Array.from({ length: METRICS_DAILY_DAYS }, (_, i) => today - (METRICS_DAILY_DAYS - 1 - i) * DAY_MS);
  const series = new Map(days.map((day) => [localDate(day), { date: localDate(day), published: 0, received: 0 }]));
  for (const ms of published) {
    const entry = series.get(localDate(ms));
    if (entry && ms <= nowMs) entry.published += 1;
  }
  for (const ms of received) {
    const entry = series.get(localDate(ms));
    if (entry && ms <= nowMs) entry.received += 1;
  }
  return [...series.values()];
}
