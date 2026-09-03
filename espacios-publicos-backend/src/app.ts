import cors from "cors";
import express from "express";
import { createContainer } from "./container";
import { errorHandler } from "./interfaces/http/middlewares/errorHandler";
import { mockIdentity } from "./interfaces/http/middlewares/mockIdentity";
import { createAuthRoutes } from "./interfaces/http/routes/authRoutes";
import { createAdminRoutes } from "./interfaces/http/routes/adminRoutes";
import { createCommunityEventRoutes } from "./interfaces/http/routes/communityEventRoutes";
import { createPublicSpaceRoutes } from "./interfaces/http/routes/publicSpaceRoutes";
import { createReservationRoutes } from "./interfaces/http/routes/reservationRoutes";
import { createUploadRoutes } from "./interfaces/http/routes/uploadRoutes";

export function createApp() {
  const app = express();
  const container = createContainer();

  app.use(cors());
  app.use(express.json());
  app.use(mockIdentity);

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", module: "espacios-publicos-cultura" });
  });

  app.use("/api/auth", createAuthRoutes(container.adminRepository));
  app.use("/api/admin", createAdminRoutes(container.adminController));
  app.use("/api/uploads", createUploadRoutes(container.storageService));
  app.use("/api/public-spaces", createPublicSpaceRoutes(container.publicSpaceController));
  app.use("/api/reservations", createReservationRoutes(container.reservationController));
  app.use("/api/community-events", createCommunityEventRoutes(container.communityEventController));

  app.use(errorHandler);

  return app;
}
