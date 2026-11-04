import { TowIntervention } from "../../domain/entities/TowIntervention";
import { TowInterventionRepository } from "../../domain/repositories/TowInterventionRepository";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";
import { MovilidadObstruccionEvaluadaInput } from "../dtos/MovilidadObstruccionEvaluadaInput";

type Clock = () => Date;

export class ProcessMobilityObstructionEvaluatedUseCase {
  constructor(
    private readonly repository: TowInterventionRepository,
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(
    input: MovilidadObstruccionEvaluadaInput
  ): Promise<TowIntervention> {
    const reclamoId = requireText(input.reclamoId, "El reclamo", 128);
    const correlationId = requireText(
      input.correlationId,
      "El identificador de correlacion",
      128
    );

    const existingIntervention = await this.repository.findByReclamoId(reclamoId);

    // El mismo evento puede ser entregado mas de una vez. Si el reclamo ya fue
    // procesado, devolvemos el estado existente sin repetir ninguna accion.
    if (existingIntervention) {
      return existingIntervention;
    }

    validateBoolean(input.afectaCiclovia, "afectaCiclovia");
    validateBoolean(
      input.requiereIntervencionInmediata,
      "requiereIntervencionInmediata"
    );
    validateBoolean(input.requiereGrua, "requiereGrua");
    validateCoordinates(input.latitud, input.longitud);
    validateStationIds(input.estacionesAfectadasIds);

    const evaluadoAt = new Date(input.evaluadoAt);

    if (!Number.isFinite(input.evaluadoAt) || Number.isNaN(evaluadoAt.getTime())) {
      throw new ValidationError("La fecha de evaluacion de Movilidad no es valida.");
    }

    const intervention = await this.repository.create({
      reclamoId,
      correlationId,
      latitud: input.latitud,
      longitud: input.longitud,
      direccion: requireText(input.direccion, "La direccion", 240),
      barrio: requireText(input.barrio, "El barrio", 120),
      afectaCiclovia: input.afectaCiclovia,
      estacionesAfectadasIds: [...input.estacionesAfectadasIds],
      impactoCirculacion: requireText(
        input.impactoCirculacion,
        "El impacto de circulacion",
        120
      ),
      desvioSugerido: requireText(
        input.desvioSugerido,
        "El desvio sugerido",
        500
      ),
      requiereIntervencionInmediata: input.requiereIntervencionInmediata,
      requiereGrua: input.requiereGrua,
      evaluadoAt
    });

    if (intervention.requiereGrua) {
      return intervention;
    }

    return this.repository.update({
      ...intervention,
      status: "COMPLETED",
      resueltoAt: this.clock()
    });
  }
}

function validateBoolean(value: boolean, fieldName: string): void {
  if (typeof value !== "boolean") {
    throw new ValidationError(`El campo ${fieldName} debe ser booleano.`);
  }
}

function validateCoordinates(latitud: number, longitud: number): void {
  const validLatitude = Number.isFinite(latitud) && latitud >= -90 && latitud <= 90;
  const validLongitude = Number.isFinite(longitud) && longitud >= -180 && longitud <= 180;

  if (!validLatitude || !validLongitude) {
    throw new ValidationError("Las coordenadas de la obstruccion no son validas.");
  }
}

function validateStationIds(value: number[]): void {
  if (
    !Array.isArray(value) ||
    value.some((id) => !Number.isSafeInteger(id) || id < 0)
  ) {
    throw new ValidationError("Las estaciones afectadas no son validas.");
  }
}
