import { Alert, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { EmergencyEventNotice } from '../lib/api';

const formatDate = (date: string) => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(date));

function describe(notice: EmergencyEventNotice) {
  switch (notice.status) {
    case 'SUSPENDIDA':
      return { title: 'Suspendido por una emergencia cercana', detail: 'Te avisamos por mail cuando se resuelva.', color: 'orange' };
    case 'A_REPROGRAMAR':
      return { title: 'Pendiente de reprogramación', detail: 'El horario pasó durante una emergencia. Vamos a informar la nueva fecha.', color: 'orange' };
    case 'REPROGRAMADA':
      return { title: 'Reprogramado por una emergencia', detail: `Nuevo horario: ${formatDate(notice.startDate)} a ${formatDate(notice.endDate)}.`, color: 'blue' };
    default:
      return null;
  }
}

export default function EmergencyNotice({ notice }: { notice?: EmergencyEventNotice }) {
  const content = notice ? describe(notice) : null;

  if (!content) {
    return null;
  }

  return (
    <Alert color={content.color} icon={<IconAlertTriangle size="1rem" />} title={content.title} mt="md">
      <Text size="sm">{content.detail}</Text>
    </Alert>
  );
}
