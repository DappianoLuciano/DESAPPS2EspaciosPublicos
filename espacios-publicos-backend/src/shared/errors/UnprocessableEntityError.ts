import { AppError } from "./AppError";

export class UnprocessableEntityError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}
