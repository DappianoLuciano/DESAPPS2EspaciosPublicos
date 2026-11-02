import { WeatherForecast } from "../../src/domain/services/WeatherForecastProvider";
import { WeatherRiskEvaluator } from "../../src/domain/services/WeatherRiskEvaluator";

const evaluator = new WeatherRiskEvaluator({
  lowWindGustKmh: 35,
  mediumWindGustKmh: 50,
  highWindGustKmh: 70,
  criticalWindGustKmh: 100,
  lowPrecipitationMm: 5,
  mediumPrecipitationMm: 20,
  highPrecipitationMm: 40,
  criticalPrecipitationMm: 80
});

function forecast(overrides?: Partial<WeatherForecast["points"][number]>): WeatherForecast {
  return {
    provider: "OPEN_METEO",
    zone: "CABA",
    latitude: -34.6037,
    longitude: -58.3816,
    points: [
      {
        time: new Date("2030-01-01T12:00:00.000Z"),
        precipitationMm: 0,
        windGustKmh: 10,
        weatherCode: 1,
        ...overrides
      }
    ]
  };
}

describe("WeatherRiskEvaluator", () => {
  function heatForecast(): WeatherForecast {
    const base = forecast();
    base.points = Array.from({ length: 72 }, (_, i) => ({
      ...base.points[0],
      time: new Date(Date.UTC(2030, 0, 1) + i * 3600_000),
      temperatureC: i % 24 === 12 ? 33 : 23
    }));
    return base;
  }

  it("detecta calor sostenido durante tres bloques completos de 24 horas", () => {
    expect(evaluator.evaluate(heatForecast())).toMatchObject({
      phenomenon: "OLA_DE_CALOR", criticality: "ALTA",
      evidence: { temperatureMinC: 23, temperatureMaxC: 33, evaluatedHours: 72 }
    });
  });

  it("no detecta ola por una sola hora o por menos de 72 horas", () => {
    expect(evaluator.evaluate(forecast({ temperatureC: 40 }))).toBeNull();
    const base = heatForecast();
    base.points.pop();
    expect(evaluator.evaluate(base)).toBeNull();
  });

  it("no detecta ola si una noche refresca o falta una temperatura", () => {
    const base = heatForecast();
    base.points[30].temperatureC = 18;
    expect(evaluator.evaluate(base)).toBeNull();
    delete base.points[30].temperatureC;
    expect(evaluator.evaluate(base)).toBeNull();
  });

  it("no acepta huecos horarios", () => {
    const base = heatForecast();
    base.points[30].time = new Date(base.points[30].time.getTime() + 60_000);
    expect(evaluator.evaluate(base)).toBeNull();
  });

  it("puede evaluar 72 h de calor sin acumular tres dias de lluvia", () => {
    const base = heatForecast();
    base.heatPoints = base.points;
    base.points = base.points.slice(0, 24);
    expect(evaluator.evaluate(base)?.phenomenon).toBe("OLA_DE_CALOR");
  });
  it("no crea riesgo cuando el pronostico queda bajo todos los umbrales", () => {
    expect(evaluator.evaluate(forecast())).toBeNull();
  });

  it("clasifica una tormenta con granizo como critica", () => {
    const risk = evaluator.evaluate(forecast({ weatherCode: 99 }));
    expect(risk).toMatchObject({
      criticality: "CRITICA",
      phenomenon: "GRANIZO"
    });
  });

  it("clasifica rafagas fuertes y conserva la evidencia", () => {
    const risk = evaluator.evaluate(forecast({ windGustKmh: 75 }));
    expect(risk).toMatchObject({
      criticality: "ALTA",
      phenomenon: "VIENTO_FUERTE",
      evidence: { maxWindGustKmh: 75, evaluatedHours: 1 }
    });
  });

  it.each([
    [95, "TORMENTA_ELECTRICA", "ALTA"],
    [75, "NIEVE", "ALTA"],
    [73, "NIEVE", "MEDIA"],
    [85, "NIEVE", "BAJA"],
    [80, "LLUVIA_INTENSA", "BAJA"]
  ])("clasifica el codigo %s como %s", (weatherCode, phenomenon, criticality) => {
    expect(evaluator.evaluate(forecast({ weatherCode: Number(weatherCode) })))
      .toMatchObject({ phenomenon, criticality });
  });
});
