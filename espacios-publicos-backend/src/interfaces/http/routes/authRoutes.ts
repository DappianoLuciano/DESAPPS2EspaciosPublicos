import { Router } from "express";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import { AdminRepository } from "../../../domain/repositories/AdminRepository";
import { mockUsers, sanitizeMockUser } from "../auth/mockUsers";
import { asyncHandler } from "../middlewares/asyncHandler";

export function createAuthRoutes(adminRepository: AdminRepository): Router {
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

      const sanitizedUser = sanitizeMockUser(user);

      if (sanitizedUser.role === "municipal_admin") {
        const admin = await adminRepository.findById(sanitizedUser.id);

        if (admin) {
          response.json({
            user: {
              ...sanitizedUser,
              name: admin.name,
              email: admin.email
            }
          });
          return;
        }
      }

      response.json({ user: sanitizedUser });
    })
  );

  return router;
}
