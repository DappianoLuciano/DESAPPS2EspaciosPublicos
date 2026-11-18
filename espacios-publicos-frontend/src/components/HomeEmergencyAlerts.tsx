import { Anchor, Box, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommunityEvent, listMyCommunityEventRegistrations } from '../lib/api';
import type { EmergencyEventNotice } from '../lib/api';
import { useEmergencyNotices } from '../lib/useEmergencyNotices';
import EmergencyNotice from './EmergencyNotice';

const VISIBLE_STATUSES = new Set(['SUSPENDIDA', 'EN_CURSO', 'A_REPROGRAMAR', 'REPROGRAMADA']);
const NONE = new Set<string>();

/**
 * Un evento que ya termino no necesita aviso: la emergencia puede seguir abierta del lado de Emergencias, pero
 * al ciudadano ya no le cambia nada. Excepcion: "pendiente de reprogramacion", que se resuelve despues.
 */
function isStillRelevant(notice: EmergencyEventNotice, now: number) {
  return notice.status === 'A_REPROGRAMAR' || new Date(notice.endDate).getTime() > now;
}

interface AffectedEvent {
  id: string;
  title: string;
  place: string;
}

/**
 * Avisos de emergencia en el Home: los eventos con una emergencia cerca, primero aquellos en los que el
 * ciudadano esta inscripto. Si alguna consulta falla, el Home se ve igual, sin avisos.
 */
export default function HomeEmergencyAlerts() {
  const { user } = useAuth();
  const notices = useEmergencyNotices();
  const [events, setEvents] = useState(new Map<string, AffectedEvent>());
  const [myRegistrations, setMyRegistrations] = useState(NONE);
  const isCitizen = user?.role === 'citizen';
  // Solo un ciudadano tiene inscripciones: para el resto no hay ninguna.
  const registered = isCitizen ? myRegistrations : NONE;

  // Se calcula una vez al montar: el Home no necesita re-renderizarse cuando termina un evento.
  const [now] = useState(() => Date.now());
  const visible = [...notices.values()].filter((notice) => VISIBLE_STATUSES.has(notice.status) && isStillRelevant(notice, now));
  const visibleKey = visible.map((notice) => notice.eventId).join(',');

  useEffect(() => {
    if (!visibleKey) {
      return;
    }

    Promise.all(visibleKey.split(',').map((id) => getCommunityEvent(id).catch(() => null)))
      .then((items) => setEvents(new Map(items.flatMap((event) => (event
        ? [[event.id, { id: event.id, title: event.title, place: event.publicSpace.name }] as const]
        : [])))));
  }, [visibleKey]);

  useEffect(() => {
    if (!isCitizen) {
      return;
    }

    listMyCommunityEventRegistrations()
      .then((items) => setMyRegistrations(new Set(items.map((item) => item.communityEventId))))
      .catch(() => setMyRegistrations(NONE));
  }, [isCitizen]);

  const items = visible
    .filter((notice) => events.has(notice.eventId))
    .sort((a, b) => Number(registered.has(b.eventId)) - Number(registered.has(a.eventId)));

  if (items.length === 0) {
    return null;
  }

  return (
    <Box mt={32}>
      <Title order={2} mb="xs">Avisos de emergencia</Title>
      <Stack gap={0}>
        {items.map((notice) => {
          const event = events.get(notice.eventId)!;
          const isRegistered = registered.has(notice.eventId);

          return (
            <EmergencyNotice key={notice.eventId} notice={notice} audience={isRegistered ? 'inscripto' : 'publico'}>
              <Text size="sm" mt={6}>
                <strong>{event.title}</strong> · {event.place}
                {isRegistered && ' · Estás inscripto'}
              </Text>
              <Anchor component={Link} to={`/event/${event.id}`} size="sm" fw={600}>
                Ver el evento
              </Anchor>
            </EmergencyNotice>
          );
        })}
      </Stack>
    </Box>
  );
}
