import { CancelCommunityEventRegistrationUseCase } from "../../src/application/use-cases/CancelCommunityEventRegistrationUseCase";
import { CommunityEventRegistrationRepository } from "../../src/domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../src/domain/repositories/CommunityEventRepository";
import { ForbiddenError } from "../../src/shared/errors/ForbiddenError";

describe("cancelacion de inscripciones propias", () => {
  const registration = {
    id: "registration-1",
    communityEventId: "event-1",
    citizenEmail: "propietario@example.com",
    communityEvent: { status: "ACTIVE" }
  };

  it("rechaza la cancelacion solicitada por otro ciudadano", async () => {
    const deleteById = jest.fn();
    const useCase = new CancelCommunityEventRegistrationUseCase(
      {} as CommunityEventRepository,
      {
        findById: jest.fn().mockResolvedValue(registration),
        deleteById
      } as unknown as CommunityEventRegistrationRepository
    );

    await expect(
      useCase.execute("registration-1", "otra-persona@example.com")
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(deleteById).not.toHaveBeenCalled();
  });

  it("permite cancelar al propietario de la inscripcion", async () => {
    const deleteById = jest.fn().mockResolvedValue(undefined);
    const useCase = new CancelCommunityEventRegistrationUseCase(
      {} as CommunityEventRepository,
      {
        findById: jest.fn().mockResolvedValue(registration),
        deleteById
      } as unknown as CommunityEventRegistrationRepository
    );

    await useCase.execute("registration-1", "PROPIETARIO@example.com");

    expect(deleteById).toHaveBeenCalledWith("registration-1");
  });
});
