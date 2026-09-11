import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createContainer } from "./container";
import { errorHandler } from "./interfaces/http/middlewares/errorHandler";
import { mockIdentity } from "./interfaces/http/middlewares/mockIdentity";
import { requestContext } from "./interfaces/http/middlewares/requestContext";
import {
  apiRateLimiter,
  authRateLimiter,
  buildCorsOptions,
  requireHttps,
  uploadRateLimiter
} from "./interfaces/http/middlewares/httpSecurity";
import { createAuthRoutes } from "./interfaces/http/routes/authRoutes";
import { createAdminRoutes } from "./interfaces/http/routes/adminRoutes";
import { createCommunityEventRoutes } from "./interfaces/http/routes/communityEventRoutes";
import { createPublicSpaceRoutes } from "./interfaces/http/routes/publicSpaceRoutes";
import { createReservationRoutes } from "./interfaces/http/routes/reservationRoutes";
import { createUploadRoutes } from "./interfaces/http/routes/uploadRoutes";
import { createChatbotRoutes } from "./interfaces/http/routes/chatbotRoutes";
import { isProductionRuntime } from "./shared/runtime/runtimeMode";

export function createApp() {
  const app = express();
  const container = createContainer();

  if (isProductionRuntime()) {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(
    helmet({
      strictTransportSecurity: isProductionRuntime() ? undefined : false
    })
  );
  app.use(cors(buildCorsOptions()));
  app.use(requireHttps);
  app.use(express.json({ limit: "100kb" }));
  app.use(mockIdentity);

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", module: "espacios-publicos-cultura" });
  });

  app.use("/api", apiRateLimiter);
  app.use("/api/auth", authRateLimiter, createAuthRoutes(container.adminRepository));
  app.use("/api/admin", createAdminRoutes(container.adminController));
  app.use("/api/uploads", uploadRateLimiter, createUploadRoutes(container.storageService));
  app.use("/api/public-spaces", createPublicSpaceRoutes(container.publicSpaceController));
  app.use("/api/reservations", createReservationRoutes(container.reservationController));
  app.use("/api/community-events", createCommunityEventRoutes(container.communityEventController));
  app.use("/api/chat", createChatbotRoutes(container.chatbotController));

  app.use((request, response) => {
    response.status(404).json({
      message: "Ruta no encontrada.",
      requestId: request.requestId
    });
  });

  app.use(errorHandler);

  return app;
}
