import { Request, Response } from "express";
import { GetCommunityEventUseCase } from "../../src/application/use-cases/GetCommunityEventUseCase";
import { ListCitizenCommunityEventRegistrationsUseCase } from "../../src/application/use-cases/ListCitizenCommunityEventRegistrationsUseCase";
import { ListCommunityEventRegistrationsUseCase } from "../../src/application/use-cases/ListCommunityEventRegistrationsUseCase";
import { ListCommunityEventsUseCase } from "../../src/application/use-cases/ListCommunityEventsUseCase";
import { CreateCommunityEventUseCase } from "../../src/application/use-cases/CreateCommunityEventUseCase";
import { CancelCommunityEventRegistrationUseCase } from "../../src/application/use-cases/CancelCommunityEventRegistrationUseCase";
import { RegisterCitizenToCommunityEventUseCase } from "../../src/application/use-cases/RegisterCitizenToCommunityEventUseCase";
import { ListReservationsUseCase } from "../../src/application/use-cases/ListReservationsUseCase";
import { RequestReservationUseCase } from "../../src/application/use-cases/RequestReservationUseCase";
import { GetReservationUseCase } from "../../src/application/use-cases/GetReservationUseCase";
import { CommunityEventController } from "../../src/interfaces/http/controllers/CommunityEventController";
import { ReservationController } from "../../src/interfaces/http/controllers/ReservationController";
import { mockUsers, sanitizeMockUser } from "../../src/interfaces/http/auth/mockUsers";

function mockResponse(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn()
  } as unknown as Response;
}

describe("identidad mock en operaciones ciudadanas", () => {
  const citizen = sanitizeMockUser(
    mockUsers.find((user) => user.username === "ciudadano")!
  );

  it("usa nombre y email autenticados al crear una reserva", async () => {
    const createReservation = {
      execute: jest.fn().mockResolvedValue({ id: "reservation-1" })
    } as unknown as RequestReservationUseCase;
    const controller = new ReservationController(
      createReservation,
      {} as ListReservationsUseCase,
      {} as GetReservationUseCase
    );
    const request = {
      user: citizen,
      body: {
        publicSpaceId: "space-1",
        requesterName: "Nombre falsificado",
        requesterEmail: "falso@example.com",
        estimatedAttendees: 2,
        startDate: "2030-01-01T10:00:00.000Z",
        endDate: "2030-01-01T11:00:00.000Z"
      }
    } as Request;

    await controller.create(request, mockResponse());

    expect(createReservation.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterName: "Ciudadano de prueba",
        requesterEmail: "ciudadano@citypass.test"
      })
    );
  });

  it("usa nombre y email autenticados al inscribirse a un evento", async () => {
    const registerCitizen = {
      execute: jest.fn().mockResolvedValue({ id: "registration-1" })
    } as unknown as RegisterCitizenToCommunityEventUseCase;
    const controller = new CommunityEventController(
      {} as CreateCommunityEventUseCase,
      {} as ListCommunityEventsUseCase,
      {} as GetCommunityEventUseCase,
      registerCitizen,
      {} as ListCommunityEventRegistrationsUseCase,
      {} as ListCitizenCommunityEventRegistrationsUseCase,
      {} as CancelCommunityEventRegistrationUseCase
    );
    const request = {
      user: citizen,
      params: { id: "event-1" }
    } as unknown as Request;

    await controller.registerCitizen(request, mockResponse());

    expect(registerCitizen.execute).toHaveBeenCalledWith({
      communityEventId: "event-1",
      citizenName: "Ciudadano de prueba",
      citizenEmail: "ciudadano@citypass.test"
    });
  });
});
