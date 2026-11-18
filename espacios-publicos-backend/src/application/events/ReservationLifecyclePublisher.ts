import { randomUUID } from "crypto";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { eventNames } from "../../shared/events/eventTypes";
import { logger } from "../../shared/logging/logger";

export type ReservationKind = "ESPACIO" | "EVENTO";
export type ReservationState = "PENDIENTE" | "CONFIRMADA" | "CANCELADA";

export interface ReservationCreatedData {
  reservaId: string;
  tipoReserva: ReservationKind;
  /** eventoId para una inscripcion, espacioId para la reserva de un espacio. */
  recursoId: string;
  espacioId: string;
  /** Categoria del evento, o del espacio si se reserva un espacio. */
  categoria: string | null;
  zona: string | null;
  latitud: number | null;
  longitud: number | null;
  inicio: Date;
  fin: Date;
  cantidadPersonas: number;
  cupoMaximo: number | null;
  createdAt: Date;
}

/**
 * ReservaCreada y ReservaActualizada, con los nombres de campo que lee Analitica
 * (CONTRATO_ESPACIOS.md, Parte 2). Se publican ademas de ReservaConfirmada, que sigue para Movilidad.
 * No llevan datos personales. Un fallo aca no frena la reserva: se loguea y la reserva sigue.
 */
export class ReservationLifecyclePublisher {
  constructor(
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  /** Una reserva nace confirmada: sale creada (PENDIENTE) y enseguida actualizada a CONFIRMADA. */
  async createdAndConfirmed(data: ReservationCreatedData): Promise<void> {
    await this.publish([
      this.event(eventNames.reservationCreated(), {
        reservaId: data.reservaId,
        tipoReserva: data.tipoReserva,
        recursoId: data.recursoId,
        espacioId: data.espacioId,
        categoria: data.categoria,
        zona: data.zona,
        latitud: data.latitud,
        longitud: data.longitud,
        fechaHora: data.inicio.toISOString(),
        fechaFin: data.fin.toISOString(),
        cantidadPersonas: data.cantidadPersonas,
        cupoMaximo: data.cupoMaximo,
        organizadorId: null,
        createdAt: data.createdAt.toISOString(),
        correlationId: data.reservaId
      }),
      this.updatedEvent(data.reservaId, "PENDIENTE", "CONFIRMADA", null)
    ]);
  }

  async cancelled(reservaId: string, motivo: string): Promise<void> {
    await this.publish([this.updatedEvent(reservaId, "CONFIRMADA", "CANCELADA", motivo)]);
  }

  private updatedEvent(
    reservaId: string,
    estadoAnterior: ReservationState,
    estadoNuevo: ReservationState,
    motivo: string | null
  ): DomainEvent {
    return this.event(eventNames.reservationUpdated(), {
      reservaId,
      estadoAnterior,
      estadoNuevo,
      motivo,
      updatedAt: new Date().toISOString(),
      correlationId: reservaId
    });
  }

  private event(name: string, payload: Record<string, unknown>): DomainEvent {
    return { id: randomUUID(), name, payload, occurredAt: new Date() };
  }

  private async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.eventOutboxRepository.save(event);
        await this.eventBus.publish(event);
      } catch (error) {
        logger.warn({ err: error, eventName: event.name }, "No se pudo publicar el evento de reserva para Analitica");
      }
    }
  }
}
