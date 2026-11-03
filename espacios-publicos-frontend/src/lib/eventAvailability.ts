/** Compartido por catálogo, detalle e inscripciones: nunca comunicar el estado solo con color. */
export function eventAvailability(event: { status: string; statusReason?: string | null }) {
  const suspended = event.status === 'SUSPENDED';
  const cancelled = event.status === 'CANCELLED';
  return {
    unavailable: suspended || cancelled,
    label: suspended ? 'Suspendido temporalmente' : cancelled ? 'Cancelado definitivamente' : null,
    reason: event.statusReason?.trim() || null,
    imageStyle: suspended || cancelled ? { filter: 'grayscale(1) contrast(1.2) brightness(0.7)' } : undefined,
  };
}
