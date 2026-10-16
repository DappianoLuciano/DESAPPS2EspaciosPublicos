import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { MockUser } from "../auth/mockUsers";
import { verifySessionToken } from "../../../infrastructure/auth/jwtSessionService";
import { CityPassTokenVerifier } from "../../../infrastructure/auth/CityPassTokenVerifier";

const defaultCityPassVerifier = new CityPassTokenVerifier();

export interface JwtIdentityRequest {
  header(name: string): string | string[] | undefined;
  user?: MockUser;
}

export function createJwtIdentity(
  cityPassVerifier: CityPassTokenVerifier = defaultCityPassVerifier
) {
  return async (request: JwtIdentityRequest, _response: Response | unknown, next: NextFunction): Promise<void> => {
    const rawHeader = request.header("authorization");
    const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      next();
      return;
    }

    try {
      const decoded = jwt.decode(token, { complete: true });
      const alg = typeof decoded === "object" && decoded !== null ? decoded.header?.alg : undefined;

      if (alg === "RS256") {
        const cityPassIdentity = await cityPassVerifier.verify(token);

        if (cityPassIdentity && cityPassIdentity.isAdmin) {
          request.user = {
            id: cityPassIdentity.sub,
            name: cityPassIdentity.preferredUsername,
            email: `${cityPassIdentity.preferredUsername.toLowerCase()}@citypass.local`,
            role: "municipal_admin"
          };
        }
      } else {
        const payload = verifySessionToken(token);
        if (payload) {
          request.user = { id: payload.sub, name: payload.name, email: payload.email, role: payload.role };
        }
      }
    } catch {
      // Ignorar token invalido o corrupto
    }

    next();
  };
}

export const jwtIdentity = createJwtIdentity();

