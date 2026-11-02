import { Request, Response } from "express";
import { ReceiveGatewayEventUseCase } from "../../../application/use-cases/ReceiveGatewayEventUseCase";

export class GatewayWebhookController {
  constructor(private readonly receiveGatewayEventUseCase: ReceiveGatewayEventUseCase) {}

  receive = async (request: Request, response: Response): Promise<void> => {
    await this.receiveGatewayEventUseCase.execute(request.body);

    // Procesado, duplicado o ignorado: para el dispatcher todo es "entregado".
    response.status(204).send();
  };
}
