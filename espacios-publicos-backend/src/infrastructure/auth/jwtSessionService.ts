import jwt from "jsonwebtoken";
import { UserRole } from "../../domain/entities/User";

export interface SessionTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

const SESSION_TTL = "7d";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET no esta configurado.");
  }

  return secret;
}

export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: SESSION_TTL });
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret());

    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof decoded.sub === "string" &&
      typeof decoded.email === "string" &&
      typeof decoded.name === "string" &&
      (decoded.role === "citizen" || decoded.role === "municipal_admin")
    ) {
      return { sub: decoded.sub, email: decoded.email, name: decoded.name, role: decoded.role };
    }

    return null;
  } catch {
    return null;
  }
}
