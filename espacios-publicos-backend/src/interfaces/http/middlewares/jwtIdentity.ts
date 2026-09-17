import { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "../../../infrastructure/auth/jwtSessionService";

export function jwtIdentity(request: Request, _response: Response, next: NextFunction): void {
  const header = request.header("authorization");

  if (!header || !header.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  const payload = token ? verifySessionToken(token) : null;

  if (payload) {
    request.user = { id: payload.sub, name: payload.name, email: payload.email, role: payload.role };
  }

  next();
}
