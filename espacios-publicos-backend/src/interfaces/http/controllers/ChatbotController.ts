import { Request, Response } from "express";
import { AskEventsChatbotUseCase } from "../../../application/use-cases/AskEventsChatbotUseCase";

export class ChatbotController {
  constructor(private readonly askEventsChatbotUseCase: AskEventsChatbotUseCase) {}

  ask = async (request: Request, response: Response): Promise<void> => {
    const result = await this.askEventsChatbotUseCase.execute({
      message: request.body.message,
      history: request.body.history
    });

    response.json(result);
  };
}
