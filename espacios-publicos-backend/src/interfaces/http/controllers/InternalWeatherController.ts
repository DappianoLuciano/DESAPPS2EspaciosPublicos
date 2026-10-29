import { Request, Response } from "express";
import { RunWeatherCycleUseCase } from "../../../application/use-cases/RunWeatherCycleUseCase";

export class InternalWeatherController {
  constructor(private readonly runWeatherCycle: RunWeatherCycleUseCase) {}

  runCycle = async (_request: Request, response: Response): Promise<void> => {
    response.json(await this.runWeatherCycle.execute());
  };
}
