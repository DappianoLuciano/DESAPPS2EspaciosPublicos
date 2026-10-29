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
