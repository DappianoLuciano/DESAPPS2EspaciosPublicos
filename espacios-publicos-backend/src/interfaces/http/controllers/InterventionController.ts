import { Request, Response } from "express";
import {
  FinishInterventionUseCase,
  ListPendingInterventionsUseCase
} from "../../../application/use-cases/FinishInterventionUseCase";

export class InterventionController {
  constructor(
    private readonly listPending: ListPendingInterventionsUseCase,
    private readonly finishIntervention: FinishInterventionUseCase
  ) {}

  list = async (_request: Request, response: Response): Promise<void> => {
    const incidents = await this.listPending.execute();
    response.json(incidents.map((incident) => ({
      reclamoId: incident.externalId,
      category: incident.category,
      latitude: incident.latitude,
      longitude: incident.longitude,
      zone: incident.zone,
      reportedAt: incident.reportedAt
    })));
  };

  finish = async (request: Request, response: Response): Promise<void> => {
    const event = await this.finishIntervention.execute({
      reclamoId: request.params.reclamoId,
      resultado: request.body?.resultado,
      idAuto: request.body?.idAuto
    });
    response.json(event.payload);
  };
}
