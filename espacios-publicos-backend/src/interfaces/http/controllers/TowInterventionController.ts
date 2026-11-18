import { Request, Response } from "express";
import { MovilidadObstruccionEvaluadaInput } from "../../../application/dtos/MovilidadObstruccionEvaluadaInput";
import { ListTowInterventionsUseCase } from "../../../application/use-cases/ListTowInterventionsUseCase";
import { ProcessMobilityObstructionEvaluatedUseCase } from "../../../application/use-cases/ProcessMobilityObstructionEvaluatedUseCase";
import { RequestTowUseCase } from "../../../application/use-cases/RequestTowUseCase";
import { CompleteTowServiceUseCase } from "../../../application/use-cases/CompleteTowServiceUseCase";

export class TowInterventionController {
  constructor(
    private readonly processMobilityObstructionEvaluatedUseCase: ProcessMobilityObstructionEvaluatedUseCase,
    private readonly listTowInterventionsUseCase: ListTowInterventionsUseCase,
    private readonly requestTowUseCase: RequestTowUseCase,
    private readonly completeTowServiceUseCase: CompleteTowServiceUseCase
  ) {}

  list = async (_request: Request, response: Response): Promise<void> => {
    const interventions = await this.listTowInterventionsUseCase.execute();
    response.json(interventions);
  };

  simulateMobilityEvent = async (
    request: Request,
    response: Response
  ): Promise<void> => {
    const intervention = await this.processMobilityObstructionEvaluatedUseCase.execute(
      request.body as MovilidadObstruccionEvaluadaInput
    );

    response.status(201).json(intervention);
  };

  requestTow = async (request: Request, response: Response): Promise<void> => {
    const intervention = await this.requestTowUseCase.execute({
      interventionId: request.params.id,
      patente: request.body.patente
    });

    response.json(intervention);
  };

  completeTowService = async (
    request: Request,
    response: Response
  ): Promise<void> => {
    const intervention = await this.completeTowServiceUseCase.execute({
      interventionId: request.params.id
    });

    response.json(intervention);
  };
}
