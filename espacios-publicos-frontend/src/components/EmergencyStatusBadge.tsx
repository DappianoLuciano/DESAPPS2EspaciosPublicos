import { Badge } from '@mantine/core';
import type { EmergencyEventNotice } from '../lib/api';

const LABELS: Record<EmergencyEventNotice['status'], { label: string; color: string } | null> = {
  SUSPENDIDA: { label: 'Suspendido por emergencia', color: 'orange' },
  A_REPROGRAMAR: { label: 'A reprogramar por emergencia', color: 'red' },
  REPROGRAMADA: { label: 'Reprogramado por emergencia', color: 'blue' },
  CONFIRMADA: null,
};

/** Estado de un evento afectado por el CU-01. Devuelve null si no hay emergencia activa. */
export default function EmergencyStatusBadge({ notice }: { notice?: EmergencyEventNotice }) {
  const content = notice ? LABELS[notice.status] : null;

  if (!content) {
    return null;
  }

  return <Badge color={content.color} variant="light">{content.label}</Badge>;
}
