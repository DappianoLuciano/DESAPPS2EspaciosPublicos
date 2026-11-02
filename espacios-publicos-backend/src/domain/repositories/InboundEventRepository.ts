export interface InboundEventRepository {
  exists(eventId: string): Promise<boolean>;
  record(eventId: string, eventType: string): Promise<void>;
}
