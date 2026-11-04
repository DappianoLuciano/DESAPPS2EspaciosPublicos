import type {
  SimulateMobilityObstructionPayload,
  TowIntervention,
} from './api';

export interface TowSimulationForm {
  reclamoId: string;
  correlationId: string;
  direccion: string;
  barrio: string;
  latitud: number;
  longitud: number;
  impactoCirculacion: string;
  desvioSugerido: string;
  afectaCiclovia: boolean;
  requiereIntervencionInmediata: boolean;
  requiereGrua: boolean;
}

export function createTowSimulationForm(now = Date.now()): TowSimulationForm {
  const suffix = now.toString();
  return {
    reclamoId: `reclamo-demo-${suffix}`,
    correlationId: `corr-demo-${suffix}`,
    direccion: 'Av. Corrientes 1000',
    barrio: 'San Nicolás',
    latitud: -34.6037,
    longitud: -58.3816,
    impactoCirculacion: 'ALTO',
    desvioSugerido: 'Desviar por Av. Córdoba',
    afectaCiclovia: true,
    requiereIntervencionInmediata: true,
    requiereGrua: true,
  };
}

export function toMobilitySimulationPayload(
  form: TowSimulationForm,
  evaluatedAt = Date.now()
): SimulateMobilityObstructionPayload {
  return {
    ...form,
    reclamoId: form.reclamoId.trim(),
    correlationId: form.correlationId.trim(),
    direccion: form.direccion.trim(),
    barrio: form.barrio.trim(),
    impactoCirculacion: form.impactoCirculacion.trim(),
    desvioSugerido: form.desvioSugerido.trim(),
    estacionesAfectadasIds: [],
    evaluadoAt: evaluatedAt,
  };
}

export function normalizePlate(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function summarizeTowInterventions(items: TowIntervention[]) {
  return {
    total: items.length,
    pending: items.filter((item) => item.status === 'PENDING').length,
    requested: items.filter((item) => item.status === 'TOW_REQUESTED').length,
    completed: items.filter((item) => item.status === 'COMPLETED').length,
  };
}
