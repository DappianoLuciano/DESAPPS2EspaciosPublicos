import { Alert, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { EmergencyEventNotice } from '../lib/api';

const formatDate = (date: string) => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(date));

/** inscripto: tiene inscripcion o reserva y recibe los mails. publico: ve el evento sin estar inscripto. */
export type EmergencyNoticeAudience = 'inscripto' | 'publico';

function describe(notice: EmergencyEventNotice, audience: EmergencyNoticeAudience) {
  const inscripto = audience === 'inscripto';

  switch (notice.status) {
    case 'SUSPENDIDA':
      return inscripto
        ? { title: 'Suspendido por una emergencia cercana', detail: 'Te avisamos por mail cuando se resuelva.', color: 'orange' }
        : { title: 'Inscripciones pausadas por una emergencia cercana', detail: 'El evento podría reprogramarse o cancelarse.', color: 'orange' };
    case 'EN_CURSO':
      return inscripto
        ? { title: 'Emergencia cerca durante el evento', detail: 'Se presentó una emergencia cerca durante el desarrollo del evento. Podría suspenderse; te avisamos por mail cualquier novedad.', color: 'yellow' }
        : { title: 'Emergencia cerca durante el evento', detail: 'Se presentó una emergencia cerca durante el desarrollo del evento. Podría suspenderse.', color: 'yellow' };
    case 'A_REPROGRAMAR':
      return inscripto
        ? { title: 'Pendiente de reprogramación', detail: 'El horario pasó durante una emergencia. Vamos a informar la nueva fecha.', color: 'orange' }
        : { title: 'Pendiente de reprogramación', detail: 'El horario pasó durante una emergencia. La nueva fecha se va a publicar acá.', color: 'orange' };
    case 'REPROGRAMADA':
      return { title: 'Reprogramado por una emergencia', detail: `Nuevo horario: ${formatDate(notice.startDate)} a ${formatDate(notice.endDate)}.`, color: 'blue' };
    default:
      return null;
  }
}

export default function EmergencyNotice({
  notice,
  audience = 'inscripto',
  children,
}: {
  notice?: EmergencyEventNotice;
  audience?: EmergencyNoticeAudience;
  children?: ReactNode;
}) {
  const content = notice ? describe(notice, audience) : null;

  if (!content) {
    return null;
  }

  return (
    <Alert color={content.color} icon={<IconAlertTriangle size="1rem" />} title={content.title} mt="md">
      <Text size="sm">{content.detail}</Text>
      {children}
    </Alert>
  );
}
