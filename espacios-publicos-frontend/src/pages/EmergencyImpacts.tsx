import { Alert, Badge, Box, Button, Group, Modal, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { deriveSpaceProblem, getEmergencyImpacts, rescheduleEmergencyImpact } from '../lib/api';
import type { EmergencyImpact, EmergencyImpactStatus, EmergencyImpactsResponse, SpaceProblem } from '../lib/api';

const STATUS: Record<EmergencyImpactStatus, { label: string; color: string }> = {
  SUSPENDIDA: { label: 'Suspendida', color: 'orange' },
  CONFIRMADA: { label: 'Confirmada', color: 'green' },
  REPROGRAMADA: { label: 'Reprogramada', color: 'blue' },
  A_REPROGRAMAR: { label: 'A reprogramar', color: 'red' },
};

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
  const [deriving, setDeriving] = useState<SpaceProblem | null>(null);
  const [area, setArea] = useState('');
  const [saving, setSaving] = useState(false);

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

  const closeReschedule = () => {
    setRescheduling(null);
    setStartDate('');
    setEndDate('');
  };

  const closeDerive = () => {
    setDeriving(null);
    setArea('');
  };

  return (
    <Box p={{ base: 'md', sm: 40 }}>
      <Title order={1} fz={32}>Emergencias</Title>
      <Text c="dimmed" mb="xl">Reservas afectadas por emergencias cercanas y problemáticas del espacio público.</Text>

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
                  {impact.status !== 'CONFIRMADA' && (
                    <Button size="xs" variant="light" onClick={() => setRescheduling(impact)}>Reprogramar</Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {data?.impacts.length === 0 && <Text c="dimmed" mb="xl">No hay reservas afectadas.</Text>}

      <Title order={2} fz="lg" mb="sm">Problemáticas</Title>
      <Table.ScrollContainer minWidth={640}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Emergencia</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Registrada</Table.Th>
              <Table.Th>Derivada a</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.problems.map((problem) => (
              <Table.Tr key={problem.id}>
                <Table.Td>{problem.emergenciaId}</Table.Td>
                <Table.Td>{problem.type}</Table.Td>
                <Table.Td>{formatDate(problem.createdAt)}</Table.Td>
                <Table.Td>{problem.derivedTo ?? 'Sin derivar'}</Table.Td>
                <Table.Td>
                  {problem.status === 'REGISTRADA' && (
                    <Button size="xs" variant="light" onClick={() => setDeriving(problem)}>Derivar</Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {data?.problems.length === 0 && <Text c="dimmed">No hay problemáticas registradas.</Text>}

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

      <Modal opened={deriving !== null} onClose={closeDerive} title="Derivar problemática">
        <Stack>
          <TextInput label="Área responsable" value={area} onChange={(event) => setArea(event.currentTarget.value)} />
          <Group justify="flex-end">
            <Button
              loading={saving}
              disabled={!area.trim()}
              onClick={() => deriving && save(() => deriveSpaceProblem(deriving.id, area), closeDerive)}
            >
              Derivar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
