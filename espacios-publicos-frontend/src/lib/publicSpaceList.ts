import type { PublicSpace } from './api';

export type SpaceStatusFilter = 'ALL' | 'ENABLED' | 'DISABLED' | 'RESTRICTED';
export const spaceStatusLabels: Record<SpaceStatusFilter, string> = {
  ALL: 'Todos', ENABLED: 'Habilitados', DISABLED: 'Deshabilitados', RESTRICTED: 'Restricción vigente',
};
export const exposureLabels = { INDOOR: 'Interior', OUTDOOR: 'Exterior', MIXED: 'Mixto' };
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function spaceWeatherState(space: PublicSpace, now: number) {
  const periods = (space.weatherRestrictions || []).filter(item => {
    const start = Date.parse(item.validFrom), end = Date.parse(item.validUntil);
    return Number.isFinite(start) && Number.isFinite(end) && start < end && now < end;
  });
  return { active: periods.filter(item => Date.parse(item.validFrom) <= now), upcoming: periods.filter(item => Date.parse(item.validFrom) > now) };
}
export function filterPublicSpaces(spaces: PublicSpace[], filters: { status: SpaceStatusFilter; search: string; category: string; exposure: string }, now: number) {
  const search = normalize(filters.search);
  const matches = spaces.filter(space => (!search || normalize(`${space.name} ${space.address} ${space.zone || ''}`).includes(search)) &&
    (filters.category === 'ALL' || (filters.category === 'NONE' ? !space.category : space.category === filters.category)) &&
    (filters.exposure === 'ALL' || space.exposure === filters.exposure));
  const counts = { ALL: matches.length, ENABLED: 0, DISABLED: 0, RESTRICTED: 0 };
  for (const space of matches) { counts[space.status]++; if (spaceWeatherState(space, now).active.length) counts.RESTRICTED++; }
  return { counts, items: matches.filter(space => filters.status === 'ALL' || (filters.status === 'RESTRICTED' ? spaceWeatherState(space, now).active.length > 0 : space.status === filters.status)) };
}
