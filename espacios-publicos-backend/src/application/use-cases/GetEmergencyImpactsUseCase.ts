import { EmergencyImpactRepository } from "../../domain/repositories/EmergencyImpactRepository";

export class GetEmergencyImpactsUseCase {
  constructor(
    private readonly impacts: Pick<EmergencyImpactRepository, "listImpacts" | "listProblems" | "getSummary" | "listEventNotices">
  ) {}

  notices() {
    return this.impacts.listEventNotices(new Date());
  }

  async execute() {
    const [summary, impacts, problems] = await Promise.all([
      this.impacts.getSummary(),
      this.impacts.listImpacts(),
      this.impacts.listProblems()
    ]);

    return { summary, impacts, problems };
  }
}
