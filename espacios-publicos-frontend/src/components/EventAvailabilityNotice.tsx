import { Alert } from '@mantine/core';
import { IconCalendarCancel } from '@tabler/icons-react';
import { eventAvailability } from '../lib/eventAvailability';

export default function EventAvailabilityNotice({ event }: { event: { status: string; statusReason?: string | null } }) {
  const availability = eventAvailability(event);
  if (!availability.unavailable) return null;
  return (
    <Alert color={event.status === 'SUSPENDED' ? 'orange' : 'red'} title={availability.label} icon={<IconCalendarCancel size={20} />}>
      {availability.reason || 'La administración informó un cambio en la disponibilidad del evento.'}
      {' '}{event.status === 'SUSPENDED'
        ? 'Las inscripciones se conservan. No asistas hasta que se informe su reanudación.'
        : 'El evento no se realizará. Las inscripciones existentes no habilitan el ingreso.'}
    </Alert>
  );
}
