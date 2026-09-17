import { User } from "../../domain/entities/User";
import { UserRepository } from "../../domain/repositories/UserRepository";
import { GoogleTokenVerifier } from "../../infrastructure/auth/GoogleTokenVerifier";
import { signSessionToken } from "../../infrastructure/auth/jwtSessionService";

export interface LoginWithGoogleResult {
  user: User;
  token: string;
}

export class LoginWithGoogleUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly googleTokenVerifier: GoogleTokenVerifier
  ) {}

  async execute(idToken: string): Promise<LoginWithGoogleResult> {
    const identity = await this.googleTokenVerifier.verify(idToken);

    let user = await this.userRepository.findByGoogleId(identity.googleId);

    if (!user) {
      user = await this.userRepository.create({
        googleId: identity.googleId,
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl
      });
    }

    const token = signSessionToken({ sub: user.id, email: user.email, name: user.name, role: user.role });

    return { user, token };
  }
}
