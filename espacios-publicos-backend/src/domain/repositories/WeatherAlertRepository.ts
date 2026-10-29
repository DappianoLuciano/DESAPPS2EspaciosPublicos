import { DomainEvent } from "../entities/DomainEvent";
import {
  CreateWeatherAlertData,
  WeatherAlert,
  WeatherAlertStatus,
  WeatherCriticality
} from "../entities/WeatherAlert";

export interface WeatherAlertRepository {
  create(data: CreateWeatherAlertData): Promise<WeatherAlert>;
  findByDeduplicationKey(key: string): Promise<WeatherAlert | null>;
  findById(id: string): Promise<WeatherAlert | null>;
  findMany(status?: WeatherAlertStatus): Promise<WeatherAlert[]>;
  findExpiredConfirmed(now: Date): Promise<WeatherAlert[]>;
  hasBlockingAlert(zone: string, startDate: Date, endDate: Date): Promise<boolean>;
  confirmWithEvent(
    id: string,
    criticality: WeatherCriticality,
    validUntil: Date,
    actorSub: string,
    event: DomainEvent
  ): Promise<WeatherAlert>;
  dismiss(id: string, reason: string, actorSub: string): Promise<WeatherAlert>;
  finalizeWithEvent(id: string, actorSub: string, event: DomainEvent): Promise<WeatherAlert>;
}
