import { CancelCommunityEventUseCase } from "../../src/application/use-cases/CancelCommunityEventUseCase";
import { CommunityEvent } from "../../src/domain/entities/CommunityEvent";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { NotFoundError } from "../../src/shared/errors/NotFoundError";
import { ValidationError } from "../../src/shared/errors/ValidationError";

function buildEvent(overrides: Partial<CommunityEvent> = {}): CommunityEvent {
  return {
    id: "event-1",
    title: "Feria",
    category: "Cultura",
    tags: [],
    description: "d",
    requirements: [],
    publicSpaceId: "space-1",
    organizerName: "Municipio",
    capacity: 50,
    requiresRegistration: true,
    startDate: new Date(Date.now() + 24 * 3600_000),
    endDate: new Date(Date.now() + 27 * 3600_000),
    status: "ACTIVE",
    createdAt: new Date(),
    ...overrides
  };
}

function build(event: CommunityEvent | null) {
  const saved: DomainEvent[] = [];
  const published: DomainEvent[] = [];
  const updateStatus = jest.fn(async (_id: string, status: CommunityEvent["status"]) => ({
    ...(event as CommunityEvent),
    status
  }));
  const useCase = new CancelCommunityEventUseCase(
    { findById: jest.fn().mockResolvedValue(event), updateStatus } as never,
    { save: async (e: DomainEvent) => void saved.push(e) },
    { publish: async (e: DomainEvent) => void published.push(e) }
  );

  return { useCase, updateStatus, saved, published };
}

describe("CancelCommunityEventUseCase", () => {
  it("cancela el evento y publica EventoCancelado con el contrato exacto", async () => {
    const { useCase, updateStatus, saved, published } = build(buildEvent());

    const cancelled = await useCase.execute("event-1", "  Pronostico de tormenta  ");

    expect(updateStatus).toHaveBeenCalledWith("event-1", "CANCELLED");
    expect(cancelled.status).toBe("CANCELLED");
    expect(saved).toHaveLength(2);
    expect(published).toEqual(saved);
    expect(saved[0].name).toBe("com.citypass.espacios.EventoCancelado");
    expect(saved[0].payload).toEqual({
      eventoId: "event-1",
      espacioId: "space-1",
      motivo: "Pronostico de tormenta",
      canceladoEn: saved[0].occurredAt.toISOString(),
      correlationId: "evento-event-1"
    });
  });

  it.each([undefined, null, "", "   "])("manda motivo null si el motivo es %p", async (reason) => {
    const { useCase, saved } = build(buildEvent());

    await useCase.execute("event-1", reason);

    expect(saved[0].payload.motivo).toBeNull();
  });

  it.each([42, "x".repeat(501)])("rechaza un motivo invalido (%p)", async (reason) => {
    const { useCase, updateStatus } = build(buildEvent());

    await expect(useCase.execute("event-1", reason)).rejects.toBeInstanceOf(ValidationError);
    expect(updateStatus).not.toHaveBeenCalled();
  });

  describe("ActividadModificada", () => {
    it("se publica despues de EventoCancelado con el payload exacto del contrato", async () => {
      const { useCase, saved, published } = build(buildEvent());

      await useCase.execute("event-1", "  Tormenta  ", {
        causaTipo: "EVENTO_CLIMATICO",
        causaId: "  alert-7  ",
        actorSub: "sub-admin"
      });

      expect(saved.map((event) => event.name)).toEqual([
        "com.citypass.espacios.EventoCancelado",
        "com.citypass.espacios.ActividadModificada"
      ]);
      expect(published).toEqual(saved);
      expect(saved[1].id).not.toBe(saved[0].id);
      expect(saved[1].payload).toEqual({
        correlationId: "act-event-1",
        actividadId: "event-1",
        estadoAnterior: "PROGRAMADA",
        estadoNuevo: "CANCELADA",
        motivo: "Tormenta",
        causaId: "alert-7",
        causaTipo: "EVENTO_CLIMATICO",
        modificadaEn: saved[1].occurredAt.getTime(),
        actorSub: "sub-admin"
      });
    });

    it.each(["ACTIVE", "ACTIVE_FULL"] as const)("mapea %s a PROGRAMADA", async (status) => {
      const { useCase, saved } = build(buildEvent({ status }));

      await useCase.execute("event-1");

      expect(saved[1].payload.estadoAnterior).toBe("PROGRAMADA");
    });

    it.each(["EVENTO_CLIMATICO", "RECLAMO", "INCIDENTE_VIAL"])("acepta la causa %s", async (causaTipo) => {
      const { useCase, saved } = build(buildEvent());

      await useCase.execute("event-1", undefined, { causaTipo, causaId: "causa-1" });

      expect(saved[1].payload).toMatchObject({ causaTipo, causaId: "causa-1" });
    });

    it.each([
      [undefined, undefined],
      [null, null],
      ["", "   "]
    ])("sin causa (%p, %p) viajan null, igual que el actor y el motivo", async (causaTipo, causaId) => {
      const { useCase, saved } = build(buildEvent());

      await useCase.execute("event-1", undefined, { causaTipo, causaId });

      expect(saved[1].payload).toMatchObject({ causaTipo: null, causaId: null, actorSub: null, motivo: null });
    });

    it.each([
      ["solo el tipo", { causaTipo: "RECLAMO" }],
      ["solo el id", { causaId: "reclamo-1" }],
      ["tipo con id en blanco", { causaTipo: "RECLAMO", causaId: "   " }],
      ["tipo invalido", { causaTipo: "OTRO", causaId: "x" }],
      ["tipo en minusculas", { causaTipo: "reclamo", causaId: "x" }],
      ["tipo que no es texto", { causaTipo: 1, causaId: "x" }],
      ["id que no es texto", { causaTipo: "RECLAMO", causaId: 1 }],
      ["id demasiado largo", { causaTipo: "RECLAMO", causaId: "x".repeat(129) }]
    ])("rechaza %s sin cancelar ni publicar", async (_case, cause) => {
      const { useCase, updateStatus, saved } = build(buildEvent());

      await expect(useCase.execute("event-1", undefined, cause)).rejects.toBeInstanceOf(ValidationError);
      expect(updateStatus).not.toHaveBeenCalled();
      expect(saved).toHaveLength(0);
    });
  });

  it("falla si el evento no existe", async () => {
    const { useCase } = build(null);

    await expect(useCase.execute("event-1", "Motivo")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("falla si el evento ya esta cancelado y no publica nada", async () => {
    const { useCase, updateStatus, saved } = build(buildEvent({ status: "CANCELLED" }));

    await expect(useCase.execute("event-1", "Motivo")).rejects.toThrow("ya se encuentra cancelado");
    expect(updateStatus).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it("falla si el evento ya termino", async () => {
    const { useCase, updateStatus } = build(
      buildEvent({
        startDate: new Date(Date.now() - 5 * 3600_000),
        endDate: new Date(Date.now() - 3600_000)
      })
    );

    await expect(useCase.execute("event-1", "Motivo")).rejects.toThrow("ya termino");
    expect(updateStatus).not.toHaveBeenCalled();
  });
});
