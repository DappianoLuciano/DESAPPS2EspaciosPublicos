import { Router } from "express";
import { ForbiddenError } from "../../../shared/errors/ForbiddenError";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import { AdminRepository } from "../../../domain/repositories/AdminRepository";
import { isMockAuthEnabled } from "../auth/mockAuthMode";
import { mockUsers, sanitizeMockUser } from "../auth/mockUsers";
import { asyncHandler } from "../middlewares/asyncHandler";
import { allowBodyFields } from "../middlewares/validateRequest";
import { logSecurityAudit } from "../middlewares/securityAudit";

export function createAuthRoutes(adminRepository: AdminRepository): Router {
  const router = Router();

  router.post(
    "/mock-login",
    allowBodyFields(["email", "password"]),
    asyncHandler(async (request, response) => {
      if (!isMockAuthEnabled()) {
        logSecurityAudit(request, {
          action: "auth.mock-login",
          outcome: "denied",
          statusCode: 403
        });
        throw new ForbiddenError("El acceso simulado no esta disponible en produccion.");
      }

      const username = String(request.body.email || "").trim().toLowerCase();
      const password = String(request.body.password || "");

      const user = mockUsers.find((mockUser) => {
        return mockUser.username.toLowerCase() === username && mockUser.password === password;
      });

      if (!user) {
        logSecurityAudit(request, {
          action: "auth.mock-login",
          outcome: "denied",
          statusCode: 401
        });
        throw new UnauthorizedError("Credenciales invalidas.");
      }

      const sanitizedUser = sanitizeMockUser(user);

      if (sanitizedUser.role === "municipal_admin") {
        const admin = await adminRepository.findById(sanitizedUser.id);

        if (admin) {
          logSecurityAudit(request, {
            action: "auth.mock-login",
            outcome: "succeeded",
            statusCode: 200,
            actorId: sanitizedUser.id,
            actorRole: sanitizedUser.role
          });
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

      logSecurityAudit(request, {
        action: "auth.mock-login",
        outcome: "succeeded",
        statusCode: 200,
        actorId: sanitizedUser.id,
        actorRole: sanitizedUser.role
      });
      response.json({ user: sanitizedUser });
    })
  );

  return router;
}
