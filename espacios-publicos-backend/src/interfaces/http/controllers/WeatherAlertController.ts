import { Request, Response } from "express";
import { ConfirmWeatherAlertUseCase } from "../../../application/use-cases/ConfirmWeatherAlertUseCase";
import { DismissWeatherAlertUseCase } from "../../../application/use-cases/DismissWeatherAlertUseCase";
import { FinalizeWeatherAlertUseCase } from "../../../application/use-cases/FinalizeWeatherAlertUseCase";
import { GetWeatherAlertUseCase } from "../../../application/use-cases/GetWeatherAlertUseCase";
import { ListWeatherAlertsUseCase } from "../../../application/use-cases/ListWeatherAlertsUseCase";
import { RunWeatherCycleUseCase } from "../../../application/use-cases/RunWeatherCycleUseCase";
import { WeatherAlertStatus, WeatherCriticality } from "../../../domain/entities/WeatherAlert";
import { ValidationError } from "../../../shared/errors/ValidationError";
import { CreateManualWeatherAlertUseCase } from "../../../application/use-cases/CreateManualWeatherAlertUseCase";
import { weatherLocations } from "../../../domain/catalogs/weatherLocations";

const statuses: WeatherAlertStatus[] = ["PENDING", "CONFIRMED", "DISMISSED", "FINALIZED"];

export class WeatherAlertController {
  constructor(
    private readonly listAlerts: ListWeatherAlertsUseCase,
    private readonly getAlert: GetWeatherAlertUseCase,
    private readonly runWeatherCycle: RunWeatherCycleUseCase,
    private readonly confirmAlert: ConfirmWeatherAlertUseCase,
    private readonly dismissAlert: DismissWeatherAlertUseCase,
    private readonly finalizeAlert: FinalizeWeatherAlertUseCase,
    private readonly createManualAlert: CreateManualWeatherAlertUseCase
  ) {}

  list = async (request: Request, response: Response): Promise<void> => {
    response.json(await this.listAlerts.execute(this.parseStatus(request.query.status)));
  };

  locations = async (_request: Request, response: Response): Promise<void> => {
    response.json(weatherLocations);
  };

  createManual = async (request: Request, response: Response): Promise<void> => {
    response.status(201).json(await this.createManualAlert.execute({
      phenomenon: request.body.fenomeno,
      criticality: request.body.nivelCriticidad,
      locationIds: request.body.ubicacionesIds,
      validFrom: request.body.vigenciaDesde,
      validUntil: request.body.vigenciaHasta,
      reason: request.body.motivo,
      source: request.body.fuente,
      windGustKmh: request.body.rafagaMaxKmh,
      precipitationMm: request.body.precipitacionAcumuladaMm,
      temperatureMinC: request.body.temperaturaMinC,
      temperatureMaxC: request.body.temperaturaMaxC,
      actorSub: request.user?.id || ""
    }));
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    response.json(await this.getAlert.execute(request.params.id));
  };

  checkNow = async (_request: Request, response: Response): Promise<void> => {
    response.json(await this.runWeatherCycle.execute());
  };

  confirm = async (request: Request, response: Response): Promise<void> => {
    response.json(
      await this.confirmAlert.execute({
        alertId: request.params.id,
        criticality: request.body.nivelCriticidad as WeatherCriticality,
        validUntil: request.body.vigenciaHasta,
        actorSub: request.user?.id || ""
      })
    );
  };

  dismiss = async (request: Request, response: Response): Promise<void> => {
    response.json(
      await this.dismissAlert.execute(
        request.params.id,
        request.body.motivo,
        request.user?.id || ""
      )
    );
  };

  finalize = async (request: Request, response: Response): Promise<void> => {
    response.json(await this.finalizeAlert.execute(request.params.id, request.user?.id || ""));
  };

  private parseStatus(value: unknown): WeatherAlertStatus | undefined {
    if (value === undefined) return undefined;
    if (typeof value === "string" && statuses.includes(value as WeatherAlertStatus)) {
      return value as WeatherAlertStatus;
    }
    throw new ValidationError("El estado de alerta indicado no es valido.");
  }
}
