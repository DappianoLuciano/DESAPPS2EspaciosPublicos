import { randomUUID } from "crypto";
import { CityIncidentRecord } from "../../domain/entities/CityIncidentRecord";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { CityIncidentRepository } from "../../domain/repositories/CityIncidentRepository";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { eventNames } from "../../shared/events/eventTypes";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";

/**
 * Como termino la intervencion en la calle (CU-INT-01). Reclamos lo traduce al estado del reclamo:
 * RESUELTO = intervinimos y se soluciono; RECHAZADO = no hizo falta intervenir (ej. no hacia falta grua).
 */
export type InterventionResult = "RESUELTO" | "RECHAZADO";
export const INTERVENTION_RESULTS: readonly InterventionResult[] = ["RESUELTO", "RECHAZADO"];

export interface FinishInterventionInput {
  reclamoId: unknown;
  resultado: unknown;
  idAuto?: unknown;
}

/** Reclamos que esperan una intervencion de Espacios: incidentes activos de Reclamos con ubicacion. */
export class ListPendingInterventionsUseCase {
  constructor(private readonly cityIncidentRepository: Pick<CityIncidentRepository, "findActiveBySource">) {}

  async execute(): Promise<CityIncidentRecord[]> {
    return this.cityIncidentRepository.findActiveBySource("RECLAMOS");
  }
}

/**
 * Cierra la intervencion: da de baja el incidente y publica IntervencionFinalizada, que es lo que
 * le permite a Reclamos cerrar el reclamo del vecino.
 */
export class FinishInterventionUseCase {
  constructor(
    private readonly cityIncidentRepository: Pick<CityIncidentRepository, "findActive" | "deactivate">,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(input: FinishInterventionInput): Promise<DomainEvent> {
    const reclamoId = requireText(input.reclamoId, "El reclamo", 128);

    if (!INTERVENTION_RESULTS.includes(input.resultado as InterventionResult)) {
      throw new ValidationError("El resultado tiene que ser RESUELTO o RECHAZADO.");
    }

    const idAuto =
      input.idAuto === undefined || input.idAuto === null || input.idAuto === ""
        ? null
        : requireText(input.idAuto, "La patente", 20).toUpperCase();

    const incident = await this.cityIncidentRepository.findActive("RECLAMOS", reclamoId);

    if (!incident) {
      throw new NotFoundError("No hay una intervención pendiente para ese reclamo.");
    }

    const occurredAt = new Date();
    const event: DomainEvent = {
      id: randomUUID(),
      name: eventNames.interventionFinished(),
      // Contrato IntervencionFinalizada (schemaId 59): fechas en milisegundos epoch.
      payload: {
        reclamoId,
        resultado: input.resultado,
        idAuto,
        solicitadoAt: incident.reportedAt.getTime(),
        resueltoAt: occurredAt.getTime()
      },
      occurredAt
    };

    await this.cityIncidentRepository.deactivate("RECLAMOS", reclamoId);
    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);

    return event;
  }
}
