import { createHash, randomUUID } from "crypto";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { PublicSpace } from "../../domain/entities/PublicSpace";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { eventNames } from "../../shared/events/eventTypes";

export type PublicSpaceAffectationType = "CERRADO" | "USO_PARCIAL" | "ACCESO_RESTRINGIDO";
export type PublicSpaceAffectationCause = "EVENTO_CLIMATICO" | "RECLAMO" | "INCIDENTE_VIAL";

export type AffectedPublicSpace = Pick<PublicSpace, "id" | "category" | "latitude" | "longitude">;

export interface PublicSpaceAffectation {
  /** Id estable de la afectacion: el de la restriccion climatica, o uno nuevo. */
  afectacionId?: string;
  space: AffectedPublicSpace;
  tipoAfectacion: PublicSpaceAffectationType;
  desde: Date;
  hastaEstimada: Date | null;
  causaId: string | null;
  causaTipo: PublicSpaceAffectationCause | null;
}

/**
 * Contrato EspacioPublicoAfectado (pedido por Analitica; schema en scripts/register-event-types.ts).
 * Siempre todos los campos, con null en los opcionales. Las fechas viajan como timestamp-millis.
 */
export function buildPublicSpaceAffectedPayload(
  affectation: PublicSpaceAffectation,
  afectacionId: string,
  occurredAt: Date
): Record<string, unknown> {
  return {
    afectacionId,
    espacioId: affectation.space.id,
    categoria: affectation.space.category ?? null,
    latitud: affectation.space.latitude ?? null,
    longitud: affectation.space.longitude ?? null,
    tipoAfectacion: affectation.tipoAfectacion,
    afectacionDesde: affectation.desde.getTime(),
    afectacionHastaEstimada: affectation.hastaEstimada ? affectation.hastaEstimada.getTime() : null,
    causaId: affectation.causaId,
    causaTipo: affectation.causaTipo,
    correlationId: `afectacion-${afectacionId}`,
    occurredAt: occurredAt.getTime()
  };
}

export function buildPublicSpaceAffectedEvent(affectation: PublicSpaceAffectation, occurredAt = new Date()): DomainEvent {
  const afectacionId = affectation.afectacionId ?? randomUUID();

  return {
    id: randomUUID(),
    name: eventNames.publicSpaceAffected(),
    payload: buildPublicSpaceAffectedPayload(affectation, afectacionId, occurredAt),
    occurredAt
  };
}

/**
 * Id estable para una afectacion derivada de otra entidad (ej. reclamo + espacio): si el mismo
 * reclamo se evalua o reclasifica de nuevo, Analitica recibe el mismo afectacionId y puede deduplicar.
 * Formato UUID (v5 sobre SHA-1, sin namespace registrado).
 */
export function stableAffectationId(...parts: string[]): string {
  const hex = createHash("sha1").update(parts.join(":")).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Guarda en el outbox y publica, igual que el resto de los eventos de integracion. */
export class PublicSpaceAffectedPublisher {
  constructor(
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async publish(affectations: PublicSpaceAffectation[]): Promise<void> {
    for (const affectation of affectations) {
      const event = buildPublicSpaceAffectedEvent(affectation);
      await this.eventOutboxRepository.save(event);
      await this.eventBus.publish(event);
    }
  }
}
