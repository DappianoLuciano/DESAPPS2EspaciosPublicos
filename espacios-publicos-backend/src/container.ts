import { CancelCommunityEventRegistrationUseCase } from "./application/use-cases/CancelCommunityEventRegistrationUseCase";
import { CreateCommunityEventUseCase } from "./application/use-cases/CreateCommunityEventUseCase";
import { CreatePublicSpaceUseCase } from "./application/use-cases/CreatePublicSpaceUseCase";
import { DeletePublicSpaceUseCase } from "./application/use-cases/DeletePublicSpaceUseCase";
import { GetCommunityEventUseCase } from "./application/use-cases/GetCommunityEventUseCase";
import { ListCitizenCommunityEventRegistrationsUseCase } from "./application/use-cases/ListCitizenCommunityEventRegistrationsUseCase";
import { ListCommunityEventsUseCase } from "./application/use-cases/ListCommunityEventsUseCase";
import { ListCommunityEventRegistrationsUseCase } from "./application/use-cases/ListCommunityEventRegistrationsUseCase";
import { ListPublicSpacesUseCase } from "./application/use-cases/ListPublicSpacesUseCase";
import { ListReservationsUseCase } from "./application/use-cases/ListReservationsUseCase";
import { RegisterCitizenToCommunityEventUseCase } from "./application/use-cases/RegisterCitizenToCommunityEventUseCase";
import { RequestReservationUseCase } from "./application/use-cases/RequestReservationUseCase";
import { UpdatePublicSpaceUseCase } from "./application/use-cases/UpdatePublicSpaceUseCase";
import { GetAdminProfileUseCase } from "./application/use-cases/GetAdminProfileUseCase";
import { UpdateAdminProfileUseCase } from "./application/use-cases/UpdateAdminProfileUseCase";
import { PrismaAdminRepository } from "./infrastructure/database/PrismaAdminRepository";
import { PrismaCommunityEventRegistrationRepository } from "./infrastructure/database/PrismaCommunityEventRegistrationRepository";
import { PrismaCommunityEventRepository } from "./infrastructure/database/PrismaCommunityEventRepository";
import { PrismaEventOutboxRepository } from "./infrastructure/database/PrismaEventOutboxRepository";
import { PrismaPublicSpaceRepository } from "./infrastructure/database/PrismaPublicSpaceRepository";
import { PrismaReservationRepository } from "./infrastructure/database/PrismaReservationRepository";
import { ConsoleEventBus } from "./infrastructure/events/ConsoleEventBus";
import { SupabaseStorageService } from "./infrastructure/storage/SupabaseStorageService";
import { CommunityEventController } from "./interfaces/http/controllers/CommunityEventController";
import { AdminController } from "./interfaces/http/controllers/AdminController";
import { PublicSpaceController } from "./interfaces/http/controllers/PublicSpaceController";
import { ReservationController } from "./interfaces/http/controllers/ReservationController";

// Este archivo arma las dependencias en un solo lugar para que los controllers no creen objetos por su cuenta.
export function createContainer() {
  const adminRepository = new PrismaAdminRepository();
  const publicSpaceRepository = new PrismaPublicSpaceRepository();
  const reservationRepository = new PrismaReservationRepository();
  const communityEventRepository = new PrismaCommunityEventRepository();
  const communityEventRegistrationRepository = new PrismaCommunityEventRegistrationRepository();
  const eventOutboxRepository = new PrismaEventOutboxRepository();
  const eventBus = new ConsoleEventBus();
  const storageService = new SupabaseStorageService();

  const getAdminProfileUseCase = new GetAdminProfileUseCase(adminRepository);
  const updateAdminProfileUseCase = new UpdateAdminProfileUseCase(adminRepository);

  const createPublicSpaceUseCase = new CreatePublicSpaceUseCase(publicSpaceRepository);
  const listPublicSpacesUseCase = new ListPublicSpacesUseCase(publicSpaceRepository);
  const updatePublicSpaceUseCase = new UpdatePublicSpaceUseCase(publicSpaceRepository);
  const deletePublicSpaceUseCase = new DeletePublicSpaceUseCase(publicSpaceRepository);

  const requestReservationUseCase = new RequestReservationUseCase(
    publicSpaceRepository,
    reservationRepository,
    communityEventRepository,
    eventOutboxRepository,
    eventBus
  );
  const listReservationsUseCase = new ListReservationsUseCase(reservationRepository);

  const createCommunityEventUseCase = new CreateCommunityEventUseCase(
    publicSpaceRepository,
    reservationRepository,
    communityEventRepository,
    eventOutboxRepository,
    eventBus
  );
  const listCommunityEventsUseCase = new ListCommunityEventsUseCase(communityEventRepository);
  const getCommunityEventUseCase = new GetCommunityEventUseCase(communityEventRepository);
  const registerCitizenToCommunityEventUseCase = new RegisterCitizenToCommunityEventUseCase(
    communityEventRepository,
    communityEventRegistrationRepository,
    eventOutboxRepository,
    eventBus
  );
  const listCommunityEventRegistrationsUseCase = new ListCommunityEventRegistrationsUseCase(
    communityEventRepository,
    communityEventRegistrationRepository
  );
  const listCitizenCommunityEventRegistrationsUseCase =
    new ListCitizenCommunityEventRegistrationsUseCase(communityEventRegistrationRepository);
  const cancelCommunityEventRegistrationUseCase = new CancelCommunityEventRegistrationUseCase(
    communityEventRepository,
    communityEventRegistrationRepository
  );

  return {
    adminRepository,
    storageService,
    adminController: new AdminController(getAdminProfileUseCase, updateAdminProfileUseCase),
    publicSpaceController: new PublicSpaceController(
      createPublicSpaceUseCase,
      listPublicSpacesUseCase,
      updatePublicSpaceUseCase,
      deletePublicSpaceUseCase
    ),
    reservationController: new ReservationController(
      requestReservationUseCase,
      listReservationsUseCase
    ),
    communityEventController: new CommunityEventController(
      createCommunityEventUseCase,
      listCommunityEventsUseCase,
      getCommunityEventUseCase,
      registerCitizenToCommunityEventUseCase,
      listCommunityEventRegistrationsUseCase,
      listCitizenCommunityEventRegistrationsUseCase,
      cancelCommunityEventRegistrationUseCase
    )
  };
}
