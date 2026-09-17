import { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "../../shared/errors/UnauthorizedError";

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export class GoogleTokenVerifier {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string) {
    this.client = new OAuth2Client(clientId);
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    let ticket;

    try {
      ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
    } catch {
      throw new UnauthorizedError("Token de Google invalido.");
    }

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedError("Token de Google invalido.");
    }

    if (payload.email_verified === false) {
      throw new UnauthorizedError("El email de Google no esta verificado.");
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email,
      avatarUrl: payload.picture || null
    };
  }
}
