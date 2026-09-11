import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ChatbotController } from "../controllers/ChatbotController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { allowBodyFields } from "../middlewares/validateRequest";

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    message: "Demasiadas consultas al asistente. Por favor, aguardá un minuto antes de volver a intentar."
  },
  standardHeaders: true,
  legacyHeaders: false
});

export function createChatbotRoutes(controller: ChatbotController): Router {
  const router = Router();

  router.post(
    "/",
    chatLimiter,
    allowBodyFields(["message", "history"]),
    asyncHandler(controller.ask)
  );

  return router;
}
