import type { WeatherAlert, WeatherAlertStatus, WeatherCriticality } from './api';

export type WeatherStatusFilter = 'ALL' | WeatherAlertStatus;
export type WeatherCriticalityFilter = 'ALL' | WeatherCriticality;

export const weatherStatusLabels: Record<WeatherStatusFilter, string> = {
  ALL: 'Todas', PENDING: 'Pendientes', CONFIRMED: 'Confirmadas', FINALIZED: 'Finalizadas', DISMISSED: 'Descartadas',
};

export function filterWeatherAlertList(alerts: WeatherAlert[], status: WeatherStatusFilter, criticality: WeatherCriticalityFilter) {
  const byCriticality = alerts.filter(alert => criticality === 'ALL' ||
    (alert.confirmedCriticality || alert.suggestedCriticality) === criticality);
  const counts: Record<WeatherStatusFilter, number> = { ALL: byCriticality.length, PENDING: 0, CONFIRMED: 0, FINALIZED: 0, DISMISSED: 0 };
  byCriticality.forEach(alert => { counts[alert.status]++; });
  return { counts, items: byCriticality.filter(alert => status === 'ALL' || alert.status === status) };
}

export function weatherMeasurement(value: number | undefined, unit: string): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${unit}` : 'Sin dato';
}
