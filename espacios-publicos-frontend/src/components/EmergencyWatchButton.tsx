import { Button, Text } from '@mantine/core';
import { IconMail } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { getEmergencyEventWatch, watchEmergencyEvent } from '../lib/api';

/**
 * CU-01: quien no esta inscripto pide que le avisen por mail si el evento pausado por una emergencia sigue,
 * se reprograma o se cancela, y recien ahi decide si se inscribe.
 */
export default function EmergencyWatchButton({ eventId, email }: { eventId: string; email?: string }) {
  const [watching, setWatching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEmergencyEventWatch(eventId)
      .then((response) => setWatching(response.watching))
      .catch(() => setWatching(false));
  }, [eventId]);

  if (watching) {
    return (
      <Text size="sm" mt="sm" fw={500}>
        Listo: te vamos a avisar por mail{email ? ` a ${email}` : ''} si sigue, se reprograma o se cancela.
      </Text>
    );
  }

  const watch = async () => {
    setSaving(true);
    setError(null);

    try {
      setWatching((await watchEmergencyEvent(eventId)).watching);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar el aviso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button mt="sm" size="xs" variant="white" color="orange" leftSection={<IconMail size="0.9rem" />} loading={saving} onClick={watch}>
        Avisarme por mail
      </Button>
      {error && <Text size="sm" c="red" mt="xs">{error}</Text>}
    </>
  );
}
