import { Alert, Badge, Box, Button, Group, Modal, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { cancelEmergencyImpact, dismissEmergencyImpact, getEmergencyImpacts, rescheduleEmergencyImpact } from '../lib/api';
import type { EmergencyImpact, EmergencyImpactStatus, EmergencyImpactsResponse } from '../lib/api';

const STATUS: Record<EmergencyImpactStatus, { label: string; color: string }> = {
  SUSPENDIDA: { label: 'Suspendida', color: 'orange' },
  EN_CURSO: { label: 'Emergencia durante el evento', color: 'yellow' },
  CONFIRMADA: { label: 'Confirmada', color: 'green' },
  REPROGRAMADA: { label: 'Reprogramada', color: 'blue' },
  A_REPROGRAMAR: { label: 'A reprogramar', color: 'red' },
  CANCELADA: { label: 'Cancelada', color: 'gray' },
};

// Pendiente: requiere una decision del backoffice.
const PENDING: readonly EmergencyImpactStatus[] = ['SUSPENDIDA', 'EN_CURSO', 'A_REPROGRAMAR'];

const isPending = (impact: EmergencyImpact) => PENDING.includes(impact.status);
const notEnded = (impact: EmergencyImpact) => new Date(impact.endDate).getTime() > Date.now();

// Lo que quedo A_REPROGRAMAR ya paso: se reprograma o se da de baja. Lo reprogramado se puede volver a mover
// mientras no haya terminado.
const canReschedule = (impact: EmergencyImpact) =>
  impact.status === 'A_REPROGRAMAR'
  || ((impact.status === 'SUSPENDIDA' || impact.status === 'EN_CURSO' || impact.status === 'REPROGRAMADA') && notEnded(impact));

// Solo los eventos comunitarios que no terminaron se pueden cancelar: las reservas de espacio se reprograman.
const canCancel = (impact: EmergencyImpact) =>
  impact.bookingType === 'COMMUNITY_EVENT'
  && (impact.status === 'SUSPENDIDA' || impact.status === 'EN_CURSO' || impact.status === 'REPROGRAMADA')
  && notEnded(impact);

const canDismiss = (impact: EmergencyImpact) => impact.status === 'A_REPROGRAMAR';

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
  const [dismissing, setDismissing] = useState<EmergencyImpact | null>(null);
  const [dismissReason, setDismissReason] = useState('');

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

  const closeDismiss = () => {
    setDismissing(null);
    setDismissReason('');
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

  const pending = data?.impacts.filter(isPending) ?? [];
  const history = data?.impacts.filter((impact) => !isPending(impact)) ?? [];

  const renderTable = (title: string, description: string, impacts: EmergencyImpact[], empty: string) => (
    <Box mb="xl">
      <Title order={2} fz="lg">{title}</Title>
      <Text c="dimmed" size="sm" mb="sm">{description}</Text>
      {data && impacts.length === 0 ? <Text c="dimmed">{empty}</Text> : (
        <Table.ScrollContainer minWidth={980}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Reserva</Table.Th>
                <Table.Th>Reserva</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Organizador</Table.Th>
                <Table.Th>Horario</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {impacts.map((impact) => (
                <Table.Tr key={impact.id}>
                  <Table.Td fw={500}>{impact.bookingLabel}</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>{impact.emergenciaId}</Text></Table.Td>
                  <Table.Td>{impact.bookingType === 'RESERVATION' ? 'Reserva' : 'Evento'}</Table.Td>
                  <Table.Td>{impact.organizerName}</Table.Td>
                  <Table.Td>{formatDate(impact.startDate)} a {formatDate(impact.endDate)}</Table.Td>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>
                    <Badge color={STATUS[impact.status].color} variant="light" styles={{ label: { overflow: 'visible' } }}>
                      {STATUS[impact.status].label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap" justify="flex-end">
                      {canReschedule(impact) && (
                        <Button size="xs" variant="light" onClick={() => setRescheduling(impact)}>Reprogramar</Button>
                      )}
                      {canCancel(impact) && (
                        <Button size="xs" variant="light" color="red" onClick={() => setCancelling(impact)}>Cancelar</Button>
                      )}
                      {canDismiss(impact) && (
                        <Button size="xs" variant="light" color="gray" onClick={() => setDismissing(impact)}>Dar de baja</Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Box>
  );

  return (
    <Box p={{ base: 'md', sm: 40 }}>
      <Title order={1} fz={32}>Emergencias</Title>
      <Text c="dimmed" mb="xl">Reservas afectadas por emergencias cercanas.</Text>

      {error && <Alert color="red" mb="md">{error}</Alert>}

      {renderTable('Pendientes', 'Suspendidas, en curso durante la emergencia o pendientes de reprogramar.',
        pending, 'No hay reservas pendientes.')}
      {renderTable('Historial', 'Confirmadas, reprogramadas o canceladas.', history, 'Todavía no hay historial.')}

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

      <Modal opened={dismissing !== null} onClose={closeDismiss} title="Dar de baja sin reprogramar">
        <Stack>
          <Text size="sm">
            El horario ya pasó durante la emergencia. Se cierra sin reprogramar
            {dismissing?.bookingType === 'COMMUNITY_EVENT' ? ', el evento queda cancelado' : ''} y se avisa por mail al
            organizador{dismissing?.bookingType === 'COMMUNITY_EVENT' ? ', a cada inscripto y a quienes pidieron enterarse' : ''}.
          </Text>
          <Textarea
            label="Motivo (opcional)"
            placeholder="No se pudo hacer por una emergencia cercana y no se va a reprogramar."
            maxLength={500}
            value={dismissReason}
            onChange={(event) => setDismissReason(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDismiss}>Volver</Button>
            <Button
              color="red"
              loading={saving}
              onClick={() => dismissing && save(() => dismissEmergencyImpact(dismissing.id, dismissReason.trim()), closeDismiss)}
            >
              Dar de baja
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
