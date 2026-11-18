import type { EmergencyEventNotice } from './api';

/** Aviso de emergencia que debe verse en lugar del estado del evento. Un evento cancelado no lo muestra. */
export function activeEmergencyNotice(
  event: { id: string; status: string },
  notices: Map<string, EmergencyEventNotice>
): EmergencyEventNotice | undefined {
  const notice = notices.get(event.id);
  return event.status !== 'CANCELLED' && notice && notice.status !== 'CONFIRMADA' && notice.status !== 'CANCELADA' ? notice : undefined;
}

/** El evento no acepta inscripciones nuevas por una emergencia. */
export function isEmergencyHold(status?: EmergencyEventNotice['status']): boolean {
  return status === 'SUSPENDIDA' || status === 'EN_CURSO' || status === 'A_REPROGRAMAR';
}
