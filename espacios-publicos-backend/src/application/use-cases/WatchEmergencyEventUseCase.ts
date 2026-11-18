import { EmergencyImpactRepository } from "../../domain/repositories/EmergencyImpactRepository";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface WatchEmergencyEventInput {
  eventId: unknown;
  email: string;
  name: string;
}

/**
 * CU-01: un ciudadano no inscripto pide que le avisen por mail que pasa con un evento pausado por una
 * emergencia (sigue, se reprograma o se cancela), para decidir recien ahi si se inscribe.
 */
export class WatchEmergencyEventUseCase {
  constructor(
    private readonly impacts: Pick<EmergencyImpactRepository, "isEventOnHold" | "addWatcher" | "isWatching">
  ) {}

  async watch(input: WatchEmergencyEventInput): Promise<{ watching: boolean }> {
    const eventId = requireText(input.eventId, "El evento", 128);
    const email = this.email(input.email);

    if (!(await this.impacts.isEventOnHold(eventId))) {
      throw new ValidationError("El evento no está pausado por una emergencia.");
    }

    await this.impacts.addWatcher(eventId, email, input.name.trim() || email);
    return { watching: true };
  }

  async status(eventId: unknown, email: string): Promise<{ watching: boolean }> {
    return { watching: await this.impacts.isWatching(requireText(eventId, "El evento", 128), this.email(email)) };
  }

  private email(value: string): string {
    const email = value.trim().toLowerCase();

    if (!EMAIL.test(email)) {
      throw new ValidationError("Tu usuario no tiene un mail válido para avisarte.");
    }

    return email;
  }
}
