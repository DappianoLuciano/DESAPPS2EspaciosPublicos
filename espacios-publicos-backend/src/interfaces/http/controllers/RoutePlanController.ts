import { Request, Response } from "express";
import { GetEventRoutePlanUseCase } from "../../../application/use-cases/GetEventRoutePlanUseCase";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class RoutePlanController {
  constructor(private readonly getEventRoutePlanUseCase: GetEventRoutePlanUseCase) {}

  get = async (request: Request, response: Response): Promise<void> => {
    const plan = await this.getEventRoutePlanUseCase.execute({
      eventId: request.params.id,
      from: this.parseOrigin(request.query.fromLat, request.query.fromLng)
    });

    response.json(plan);
  };

  // La ubicacion del usuario es opcional, pero un punto a medias no sirve.
  private parseOrigin(rawLat: unknown, rawLng: unknown) {
    if (rawLat === undefined && rawLng === undefined) {
      return undefined;
    }

    const latitude = typeof rawLat === "string" && rawLat.trim() ? Number(rawLat) : NaN;
    const longitude = typeof rawLng === "string" && rawLng.trim() ? Number(rawLng) : NaN;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      throw new ValidationError("fromLat y fromLng se informan juntas y deben ser coordenadas validas.");
    }

    return { latitude, longitude };
  }
}
