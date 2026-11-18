import { Alert, Badge, Box, Button, Group, Modal, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { cancelEmergencyImpact, getEmergencyImpacts, rescheduleEmergencyImpact } from '../lib/api';
import type { EmergencyImpact, EmergencyImpactStatus, EmergencyImpactsResponse } from '../lib/api';

const STATUS: Record<EmergencyImpactStatus, { label: string; color: string }> = {
  SUSPENDIDA: { label: 'Suspendida', color: 'orange' },
  EN_CURSO: { label: 'Emergencia durante el evento', color: 'yellow' },
  CONFIRMADA: { label: 'Confirmada', color: 'green' },
  REPROGRAMADA: { label: 'Reprogramada', color: 'blue' },
  A_REPROGRAMAR: { label: 'A reprogramar', color: 'red' },
  CANCELADA: { label: 'Cancelada', color: 'gray' },
};

const CLOSED: readonly EmergencyImpactStatus[] = ['CONFIRMADA', 'CANCELADA'];

// Solo los eventos comunitarios se pueden cancelar: las reservas de espacio se reprograman.
const canCancel = (impact: EmergencyImpact) =>
  impact.bookingType === 'COMMUNITY_EVENT' && !CLOSED.includes(impact.status);

const formatDate = (date: string) => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(date));

export default function EmergencyImpacts() {
  const [data, setData] = useState<EmergencyImpactsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<EmergencyImpact | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState<EmergencyImpact | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    getEmergencyImpacts()
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const save = async (action: () => Promise<unknown>, close: () => void) => {
    setSaving(true);

    try {
      await action();
      close();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
      close();
    } finally {
      setSaving(false);
    }
  };

  const closeCancel = () => {
    setCancelling(null);
    setReason('');
  };

  const closeReschedule = () => {
    setRescheduling(null);
    setStartDate('');
    setEndDate('');
  };

  return (
    <Box p={{ base: 'md', sm: 40 }}>
      <Title order={1} fz={32}>Emergencias</Title>
      <Text c="dimmed" mb="xl">Reservas afectadas por emergencias cercanas.</Text>

      {error && <Alert color="red" mb="md">{error}</Alert>}

      <Title order={2} fz="lg" mb="sm">Reservas afectadas</Title>
      <Table.ScrollContainer minWidth={760} mb="xl">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Emergencia</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Organizador</Table.Th>
              <Table.Th>Horario</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.impacts.map((impact) => (
              <Table.Tr key={impact.id}>
                <Table.Td>{impact.emergenciaId}</Table.Td>
                <Table.Td>{impact.bookingType === 'RESERVATION' ? 'Reserva' : 'Evento'}</Table.Td>
                <Table.Td>{impact.organizerName}</Table.Td>
                <Table.Td>{formatDate(impact.startDate)} a {formatDate(impact.endDate)}</Table.Td>
                <Table.Td><Badge color={STATUS[impact.status].color} variant="light">{STATUS[impact.status].label}</Badge></Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    {!CLOSED.includes(impact.status) && (
                      <Button size="xs" variant="light" onClick={() => setRescheduling(impact)}>Reprogramar</Button>
                    )}
                    {canCancel(impact) && (
                      <Button size="xs" variant="light" color="red" onClick={() => setCancelling(impact)}>Cancelar</Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {data?.impacts.length === 0 && <Text c="dimmed">No hay reservas afectadas.</Text>}

      <Modal opened={rescheduling !== null} onClose={closeReschedule} title="Reprogramar reserva">
        <Stack>
          <TextInput type="datetime-local" label="Nuevo inicio" value={startDate} onChange={(event) => setStartDate(event.currentTarget.value)} />
          <TextInput type="datetime-local" label="Nuevo fin" value={endDate} onChange={(event) => setEndDate(event.currentTarget.value)} />
          <Group justify="flex-end">
            <Button
              loading={saving}
              disabled={!startDate || !endDate}
              onClick={() => rescheduling && save(
                () => rescheduleEmergencyImpact(rescheduling.id, new Date(startDate).toISOString(), new Date(endDate).toISOString()),
                closeReschedule
              )}
            >
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={cancelling !== null} onClose={closeCancel} title="Cancelar evento">
        <Stack>
          <Text size="sm">
            Se cancela el evento y se avisa por mail al organizador, a cada inscripto y a quienes pidieron enterarse.
          </Text>
          <Textarea
            label="Motivo (opcional)"
            placeholder="Cancelado por una emergencia cercana."
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCancel}>Volver</Button>
            <Button
              color="red"
              loading={saving}
              onClick={() => cancelling && save(() => cancelEmergencyImpact(cancelling.id, reason.trim()), closeCancel)}
            >
              Cancelar evento
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
