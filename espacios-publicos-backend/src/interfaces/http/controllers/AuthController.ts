import { Request, Response } from "express";
import { LoginWithGoogleUseCase } from "../../../application/use-cases/LoginWithGoogleUseCase";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class AuthController {
  constructor(private readonly loginWithGoogleUseCase: LoginWithGoogleUseCase) {}

  loginWithGoogle = async (request: Request, response: Response): Promise<void> => {
    const credential = request.body.credential;

    if (typeof credential !== "string" || !credential.trim()) {
      throw new ValidationError("Falta el token de Google.");
    }

    const { user, token } = await this.loginWithGoogleUseCase.execute(credential);

    response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  };
}
