export interface WeatherRestrictionRepository {
  hasBlockingRestriction(publicSpaceId: string, start: Date, end: Date): Promise<boolean>;
}
