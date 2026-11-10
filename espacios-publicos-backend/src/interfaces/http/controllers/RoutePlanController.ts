import { Request, Response } from "express";
import { GetEventRoutePlanUseCase } from "../../../application/use-cases/GetEventRoutePlanUseCase";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class RoutePlanController {
  constructor(private readonly getEventRoutePlanUseCase: GetEventRoutePlanUseCase) {}

  get = async (request: Request, response: Response): Promise<void> => {
    const plan = await this.getEventRoutePlanUseCase.execute({
      eventId: request.params.id,
      from: this.parseOrigin(request.query.fromLat, request.query.fromLng),
      pickup: this.parsePickup(request.query)
    });

    response.json(plan);
  };

  // Estacion de retiro que el front le pidio a Movilidad (pickupLat, pickupLng, pickupName, pickupBikes).
  private parsePickup(query: Request["query"]) {
    if (query.pickupLat === undefined && query.pickupLng === undefined && query.pickupName === undefined) {
      return undefined;
    }

    const point = this.parseOrigin(query.pickupLat, query.pickupLng, "pickupLat y pickupLng");
    const name = typeof query.pickupName === "string" ? query.pickupName.trim().slice(0, 120) : "";
    const bikes = typeof query.pickupBikes === "string" && /^\d{1,4}$/.test(query.pickupBikes) ? Number(query.pickupBikes) : null;

    if (!point || !name) {
      throw new ValidationError("La estacion de retiro necesita pickupLat, pickupLng y pickupName.");
    }

    return { ...point, stationName: name, availableBikes: bikes };
  }

  // La ubicacion del usuario es opcional, pero un punto a medias no sirve.
  private parseOrigin(rawLat: unknown, rawLng: unknown, fields = "fromLat y fromLng") {
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
      throw new ValidationError(`${fields} se informan juntas y deben ser coordenadas validas.`);
    }

    return { latitude, longitude };
  }
}
