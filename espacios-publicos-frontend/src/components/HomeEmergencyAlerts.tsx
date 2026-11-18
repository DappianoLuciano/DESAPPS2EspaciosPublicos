import { Anchor, Box, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommunityEvent, listMyCommunityEventRegistrations } from '../lib/api';
import { useEmergencyNotices } from '../lib/useEmergencyNotices';
import EmergencyNotice from './EmergencyNotice';

const VISIBLE_STATUSES = new Set(['SUSPENDIDA', 'EN_CURSO', 'A_REPROGRAMAR', 'REPROGRAMADA']);
const NONE = new Set<string>();

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

  const visible = [...notices.values()].filter((notice) => VISIBLE_STATUSES.has(notice.status));
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
