import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";

/** Decisión administrativa. No finaliza alertas ni publica EventoCancelado para una suspensión. */
export class ChangeCommunityEventSuspensionUseCase {
  constructor(
    private readonly events: CommunityEventRepository,
    private readonly registrations: CommunityEventRegistrationRepository,
    private readonly spaces?: PublicSpaceRepository
  ) {}

  async execute(id: string, action: "suspend" | "resume", reason?: unknown) {
    const eventId = requireText(id, "El evento", 128);
    const suspensionReason = action === "suspend"
      ? requireText(reason, "El motivo de la suspensión", 500) : null;
    const event = await this.events.findById(eventId);
    if (!event) throw new NotFoundError("El evento comunitario indicado no existe.");
    if (event.status === "CANCELLED") throw new ValidationError("Un evento cancelado no puede reanudarse ni suspenderse.");
    if (event.endDate.getTime() <= Date.now()) throw new ValidationError("El evento ya terminó.");
    if (event.activeWeatherAlertIds?.length) throw new ValidationError("Este evento tiene medidas climáticas vinculadas. Gestioná su reanudación desde la alerta.");
    if (action === "suspend") {
      if (event.status === "SUSPENDED") throw new ValidationError("El evento ya está suspendido.");
      return this.events.updateStatus(eventId, "SUSPENDED", suspensionReason, event.status);
    }
    if (event.status !== "SUSPENDED") throw new ValidationError("Solo se puede reanudar un evento suspendido.");
    const space = await this.spaces?.findById(event.publicSpaceId);
    if (space?.status === "DISABLED") throw new ValidationError("El espacio está deshabilitado. No se puede reanudar la actividad.");
    const count = await this.registrations.countByEventId(eventId);
    const status = event.requiresRegistration && count >= event.capacity ? "ACTIVE_FULL" : "ACTIVE";
    return this.events.updateStatus(eventId, status, null, "SUSPENDED");
  }
}
