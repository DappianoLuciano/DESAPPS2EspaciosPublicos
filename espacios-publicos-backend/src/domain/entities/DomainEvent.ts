export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  name: string;
  payload: TPayload;
  occurredAt: Date;
}
