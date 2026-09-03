import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../../../shared/errors/ForbiddenError";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import { MockUser, MockUserRole } from "../auth/mockUsers";

declare global {
  namespace Express {
    interface Request {
      user?: MockUser;
    }
  }
}

const validRoles: MockUserRole[] = ["citizen", "municipal_admin"];

export function mockIdentity(request: Request, _response: Response, next: NextFunction): void {
  const id = getHeader(request, "x-user-id");
  const name = getHeader(request, "x-user-name");
  const email = getHeader(request, "x-user-email");
  const role = getHeader(request, "x-user-role") as MockUserRole | undefined;

  if (id && name && email && role && validRoles.includes(role)) {
    request.user = { id, name, email, role };
  }

  next();
}

export function requireMockAuth(request: Request, _response: Response, next: NextFunction): void {
  if (!request.user) {
    throw new UnauthorizedError("Tenes que iniciar sesion para realizar esta accion.");
  }

  next();
}

export function requireRole(role: MockUserRole) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      throw new UnauthorizedError("Tenes que iniciar sesion para realizar esta accion.");
    }

    if (request.user.role !== role) {
      throw new ForbiddenError("Tu perfil no tiene permisos para realizar esta accion.");
    }

    next();
  };
}

function getHeader(request: Request, name: string): string | undefined {
  const value = request.header(name);
  return value && value.trim() ? value.trim() : undefined;
}
