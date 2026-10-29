import { InboundEventRepository } from "../../domain/repositories/InboundEventRepository";
import { prisma } from "./prismaClient";

export class PrismaInboundEventRepository implements InboundEventRepository {
  async exists(eventId: string): Promise<boolean> {
    const found = await prisma.inboundEvent.findUnique({ where: { eventId } });
    return found !== null;
  }

  async record(eventId: string, eventType: string): Promise<void> {
    // skipDuplicates: dos entregas simultaneas del mismo eventId no deben fallar.
    await prisma.inboundEvent.createMany({
      data: [{ eventId, eventType }],
      skipDuplicates: true
    });
  }
}
