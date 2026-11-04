import { Request, Response } from "express";
import { DeriveSpaceProblemUseCase } from "../../../application/use-cases/DeriveSpaceProblemUseCase";
import { FindNearbyBookingsUseCase } from "../../../application/use-cases/FindNearbyBookingsUseCase";
import { GetEmergencyImpactsUseCase } from "../../../application/use-cases/GetEmergencyImpactsUseCase";
import { RescheduleAffectedBookingUseCase } from "../../../application/use-cases/RescheduleAffectedBookingUseCase";
import { ValidationError } from "../../../shared/errors/ValidationError";

function coordinate(value: unknown, limit: number, field: string): number {
  const parsed = typeof value === "string" && value.trim() ? Number(value) : Number.NaN;

  if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) {
    throw new ValidationError(`${field} no es valida.`);
  }

  return parsed;
}

function date(value: unknown, field: string): Date {
  const parsed = new Date(typeof value === "string" ? value : "");

  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${field} no es valida.`);
  }

  return parsed;
}

export class EmergencyImpactController {
  constructor(
    private readonly findNearbyBookings: FindNearbyBookingsUseCase,
    private readonly getImpacts: GetEmergencyImpactsUseCase,
    private readonly rescheduleBooking: RescheduleAffectedBookingUseCase,
    private readonly deriveProblem: DeriveSpaceProblemUseCase
  ) {}

  nearby = async (request: Request, response: Response): Promise<void> => {
    const { lat, lng, desde, hasta } = request.query;
    const from = date(desde, "La fecha desde");
    const to = date(hasta, "La fecha hasta");

    if (from >= to) {
      throw new ValidationError("La fecha desde debe ser anterior a la fecha hasta.");
    }

    const nearby = await this.findNearbyBookings.execute(
      { latitude: coordinate(lat, 90, "La latitud"), longitude: coordinate(lng, 180, "La longitud"), zone: null },
      from,
      to
    );

    // Sin datos personales del solicitante.
    response.json({
      items: nearby.map(({ space, distanceMeters, reservations, events }) => ({
        espacioId: space.id,
        nombre: space.name,
        distanciaMetros: distanceMeters,
        reservas: reservations.map(({ id, startDate, endDate }) => ({ id, inicio: startDate, fin: endDate })),
        eventos: events.map(({ id, title, startDate, endDate }) => ({ id, titulo: title, inicio: startDate, fin: endDate }))
      }))
    });
  };

  list = async (_request: Request, response: Response): Promise<void> => {
    response.json(await this.getImpacts.execute());
  };

  reschedule = async (request: Request, response: Response): Promise<void> => {
    response.json(await this.rescheduleBooking.execute({
      impactId: request.params.id,
      startDate: request.body.startDate,
      endDate: request.body.endDate,
      actor: request.user?.name ?? "desconocido"
    }));
  };

  derive = async (request: Request, response: Response): Promise<void> => {
    response.json(await this.deriveProblem.execute(
      request.params.id,
      request.body.derivedTo,
      request.user?.name ?? "desconocido"
    ));
  };
}
