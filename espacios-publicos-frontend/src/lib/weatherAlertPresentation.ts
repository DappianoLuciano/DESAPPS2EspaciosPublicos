import type { WeatherAlert, WeatherCriticality, WeatherPhenomenon } from './api';

export const weatherPhenomenonLabels: Record<WeatherPhenomenon, string> = {
  TORMENTA_FUERTE: 'Tormenta fuerte',
  LLUVIA_INTENSA: 'Lluvia intensa',
  VIENTO_FUERTE: 'Viento fuerte',
  OLA_DE_CALOR: 'Ola de calor',
  OLA_DE_FRIO: 'Ola de frío',
  GRANIZO: 'Granizo',
  TORMENTA_ELECTRICA: 'Tormenta eléctrica',
  HURACAN: 'Huracán',
  NIEVE: 'Nieve',
};

export const weatherCriticalityColors: Record<WeatherCriticality, string> = {
  BAJA: 'blue', MEDIA: 'yellow', ALTA: 'orange', CRITICA: 'red',
};

export const weatherCriticalityLabels: Record<WeatherCriticality, string> = {
  BAJA: 'BAJA', MEDIA: 'MEDIA', ALTA: 'ALTA', CRITICA: 'CRÍTICA',
};

export type WeatherWindowPhase = 'active' | 'upcoming' | 'expired' | 'invalid';

export function getWeatherWindow(alert: Pick<WeatherAlert, 'validFrom' | 'validUntil'>, now: number) {
  const from = Date.parse(alert.validFrom);
  const until = Date.parse(alert.validUntil);
  if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from || !Number.isFinite(now)) {
    return { phase: 'invalid' as WeatherWindowPhase, progress: 0, startsInMinutes: 0 };
  }
  const phase: WeatherWindowPhase = now < from ? 'upcoming' : now >= until ? 'expired' : 'active';
  return {
    phase,
    progress: Math.floor(Math.min(100, Math.max(0, ((now - from) / (until - from)) * 100))),
    startsInMinutes: Math.max(0, Math.ceil((from - now) / 60_000)),
  };
}

export function formatWeatherDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
}

export function formatStartsIn(minutes: number): string {
  if (minutes < 60) return `Comienza en ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours >= 24) return `Comienza en ${Math.floor(hours / 24)} d ${hours % 24} h`;
  return `Comienza en ${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

export function summarizeWeatherAlerts(alerts: WeatherAlert[], now: number, limit = 2) {
  const rank: Record<WeatherCriticality, number> = { BAJA: 1, MEDIA: 2, ALTA: 3, CRITICA: 4 };
  const confirmed = alerts.filter(alert => alert.status === 'CONFIRMED');
  const windows = confirmed.map(alert => ({ alert, phase: getWeatherWindow(alert, now).phase }));
  const relevant = windows.filter(item => item.phase === 'active' || item.phase === 'upcoming');
  const cards = relevant.map(item => item.alert).sort((a, b) => {
    const severity = rank[b.confirmedCriticality || b.suggestedCriticality] - rank[a.confirmedCriticality || a.suggestedCriticality];
    if (severity) return severity;
    const aActive = getWeatherWindow(a, now).phase === 'active';
    const bActive = getWeatherWindow(b, now).phase === 'active';
    if (aActive !== bActive) return aActive ? -1 : 1;
    return Date.parse(a.validFrom) - Date.parse(b.validFrom) || a.id.localeCompare(b.id);
  }).slice(0, Math.max(0, limit));
  return {
    cards,
    totalRelevant: relevant.length,
    activeCount: windows.filter(item => item.phase === 'active').length,
    upcomingCount: windows.filter(item => item.phase === 'upcoming').length,
    pendingCount: alerts.filter(alert => alert.status === 'PENDING').length,
    expiredCount: windows.filter(item => item.phase === 'expired').length,
    invalidCount: windows.filter(item => item.phase === 'invalid').length,
  };
}
