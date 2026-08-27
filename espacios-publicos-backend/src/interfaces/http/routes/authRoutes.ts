import { Router } from "express";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import { mockUsers, sanitizeMockUser } from "../auth/mockUsers";
import { asyncHandler } from "../middlewares/asyncHandler";

export function createAuthRoutes(): Router {
  const router = Router();

  router.post(
    "/mock-login",
    asyncHandler(async (request, response) => {
      const email = String(request.body.email || "").trim().toLowerCase();
      const password = String(request.body.password || "");

      const user = mockUsers.find((mockUser) => {
        return mockUser.email.toLowerCase() === email && mockUser.password === password;
      });

      if (!user) {
        throw new UnauthorizedError("Credenciales invalidas.");
      }

      response.json({ user: sanitizeMockUser(user) });
    })
  );

  return router;
}
