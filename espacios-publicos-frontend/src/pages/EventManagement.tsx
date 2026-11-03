import { Alert, Box, Button, Card, Flex, Group, Modal, SimpleGrid, Table, Text, Textarea, Title, Badge, ActionIcon } from '@mantine/core';
import { IconCalendarEvent, IconEye, IconPlayerPlay, IconUsersGroup } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelCommunityEvent, changeCommunityEventSuspension, listCommunityEvents } from '../lib/api';
import type { CommunityEventCatalogItem } from '../lib/api';

export default function EventManagement() {
  const [events, setEvents] = useState<CommunityEventCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [eventToCancel, setEventToCancel] = useState<CommunityEventCatalogItem | null>(null);
  const [action, setAction] = useState<'cancel' | 'suspend' | 'resume'>('cancel');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    listCommunityEvents()
      .then((response) => setEvents(response.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalCapacity = useMemo(
    () => events.reduce((total, event) => total + event.capacity, 0),
    [events]
  );

  const activeEvents = events.filter((event) => event.status === 'ACTIVE').length;

  const openCancelModal = (event: CommunityEventCatalogItem, nextAction: 'cancel' | 'suspend' | 'resume' = 'cancel') => {
    setAction(nextAction);
    setEventToCancel(event);
    setCancelReason(nextAction === 'suspend' ? 'Suspendido por alerta climática. Pendiente de revisión por la administración.' : '');
    setCancelError(null);
  };

  const closeCancelModal = () => {
    if (!cancelling) {
      setEventToCancel(null);
    }
  };

  const handleCancel = async () => {
    if (!eventToCancel) {
      return;
    }

    setCancelError(null);
    setCancelling(true);

    try {
      const updated = action === 'cancel'
        ? await cancelCommunityEvent(eventToCancel.id, cancelReason.trim() || undefined)
        : await changeCommunityEventSuspension(eventToCancel.id, action, cancelReason.trim());
      const cancelledId = eventToCancel.id;

      setEvents((current) =>
        current.map((event) => (event.id === cancelledId ? { ...event, status: updated.status, statusReason: updated.statusReason } : event))
      );
      setEventToCancel(null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'No se pudo actualizar el evento.');
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = (event: CommunityEventCatalogItem) =>
    event.status !== 'CANCELLED' && new Date(event.endDate).getTime() > now;

  const formatDate = (date: string) => (
    new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))
  );

  const getStatusBadge = (status: CommunityEventCatalogItem['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge color="green" variant="light">Activo</Badge>;
      case 'ACTIVE_FULL':
        return <Badge color="blue" variant="light">Completo</Badge>;
      case 'CANCELLED':
        return <Badge color="red" variant="light">Cancelado</Badge>;
      case 'SUSPENDED':
        return <Badge color="orange" variant="light">Suspendido</Badge>;
      default:
        return <Badge color="gray" variant="light">Sin estado</Badge>;
    }
  };

  return (
    <Box px={{ base: 'md', md: 40 }} py={40}>
      <Modal opened={eventToCancel !== null} onClose={closeCancelModal} title={action === 'suspend' ? 'Suspender temporalmente' : action === 'resume' ? 'Reanudar evento' : 'Cancelar definitivamente'} centered>
        <Flex direction="column" gap="md">
          <Text size="sm">
            <strong>{eventToCancel?.title}</strong>
            {action === 'suspend'
              ? ': se bloquearán nuevas inscripciones y se conservarán las existentes. La suspensión será visible para los ciudadanos hasta su reanudación manual.'
              : action === 'resume'
                ? ': verificá que las condiciones del clima y del espacio permitan retomar la actividad. Se conservarán los inscriptos y se habilitarán los cupos restantes.'
                : ': el evento no se realizará y dejará de admitir inscripciones. Se publicará la cancelación por el canal de eventos configurado. Esta acción no se puede deshacer.'}
          </Text>
          {cancelError && <Alert color="red">{cancelError}</Alert>}
          {action !== 'resume' && <Textarea
            label={action === 'suspend' ? 'Motivo visible para los ciudadanos' : 'Motivo visible para los ciudadanos (opcional)'}
            required={action === 'suspend'}
            placeholder="Ej: Pronóstico de tormenta"
            autosize
            minRows={2}
            maxLength={500}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.currentTarget.value)}
          />}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCancelModal} disabled={cancelling}>
              Volver
            </Button>
            <Button color={action === 'cancel' ? 'red' : action === 'suspend' ? 'orange' : 'blue'} onClick={handleCancel} loading={cancelling} disabled={action === 'suspend' && !cancelReason.trim()}>
              {action === 'suspend' ? 'Confirmar suspensión' : action === 'resume' ? 'Reanudar evento' : 'Cancelar definitivamente'}
            </Button>
          </Group>
        </Flex>
      </Modal>

      <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="md" mb={40}>
        <Box>
          <Title order={1} fz={32} mb="xs">Gestión de Eventos</Title>
          <Text c="dimmed">Administra y supervisa los eventos comunitarios publicados.</Text>
        </Box>
        <Button component={Link} to="/admin/create-event" color="blue">
          Nuevo Evento
        </Button>
      </Flex>

      {error && (
        <Alert color="red" mb="lg">
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb={40}>
        <Card shadow="sm" radius="md" withBorder p="xl">
          <Flex align="center" gap="lg">
            <Box bg="gray.1" p="md" style={{ borderRadius: '50%' }}>
              <IconCalendarEvent color="gray" size="1.5rem" />
            </Box>
            <Box>
              <Text c="dimmed" fw={600} tt="uppercase" fz="xs">TOTAL EVENTOS</Text>
              <Title order={2} fz={32} mt={4}>{events.length}</Title>
            </Box>
          </Flex>
        </Card>

        <Card shadow="sm" radius="md" withBorder p="xl">
          <Flex align="center" gap="lg">
            <Box bg="green.1" p="md" style={{ borderRadius: '50%' }}>
              <IconPlayerPlay color="teal" size="1.5rem" />
            </Box>
            <Box>
              <Text c="dimmed" fw={600} tt="uppercase" fz="xs">EVENTOS ACTIVOS</Text>
              <Title order={2} fz={32} mt={4}>{activeEvents}</Title>
            </Box>
          </Flex>
        </Card>

        <Card shadow="sm" radius="md" withBorder p="xl">
          <Flex align="center" gap="lg">
            <Box bg="blue.1" p="md" style={{ borderRadius: '50%' }}>
              <IconUsersGroup color="blue" size="1.5rem" />
            </Box>
            <Box>
              <Text c="dimmed" fw={600} tt="uppercase" fz="xs">CUPOS TOTALES</Text>
              <Title order={2} fz={32} mt={4}>{totalCapacity}</Title>
            </Box>
          </Flex>
        </Card>
      </SimpleGrid>

      <Card shadow="sm" radius="md" withBorder p={0}>
        <Box style={{ overflowX: 'auto' }}>
          <Table verticalSpacing="md" horizontalSpacing="xl" striped style={{ minWidth: 760 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>NOMBRE DEL EVENTO</Table.Th>
                <Table.Th>CATEGORÍA</Table.Th>
                <Table.Th>ESPACIO PÚBLICO</Table.Th>
                <Table.Th>FECHA</Table.Th>
                <Table.Th>CUPO</Table.Th>
                <Table.Th>ESTADO</Table.Th>
                <Table.Th>INSCRIPTOS</Table.Th>
                <Table.Th>ACCIONES</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {events.map((event) => (
                <Table.Tr key={event.id}>
                  <Table.Td fw={600}>{event.title}</Table.Td>
                  <Table.Td>{event.category}</Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>{event.publicSpace.name}</Text>
                    <Text size="xs" c="dimmed">{event.publicSpace.address}</Text>
                  </Table.Td>
                  <Table.Td>{formatDate(event.startDate)}</Table.Td>
                  <Table.Td>{event.registeredCount}/{event.capacity}</Table.Td>
                  <Table.Td>
                    {getStatusBadge(event.status)}
                    {event.statusReason && <Text size="xs" mt={6} maw={220}>{event.statusReason}</Text>}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      component={Link}
                      to={`/admin/event/${event.id}/attendees`}
                      variant="subtle"
                      color="blue"
                      aria-label={`Ver inscriptos de ${event.title}`}
                    >
                      <IconEye size="1.2rem" />
                    </ActionIcon>
                  </Table.Td>
                  <Table.Td>
                    {canCancel(event) && (
                      <Group gap="xs" wrap="wrap">
                        <Button size="xs" variant="light" disabled={!!event.activeWeatherAlertIds?.length} color={event.status === 'SUSPENDED' ? 'blue' : 'orange'} onClick={() => openCancelModal(event, event.status === 'SUSPENDED' ? 'resume' : 'suspend')}>
                          {event.status === 'SUSPENDED' ? 'Reanudar' : 'Suspender'}
                        </Button>
                        {!!event.activeWeatherAlertIds?.length && <Text size="xs" component={Link} to="/admin/weather-alerts">Gestionar desde la alerta climática</Text>}
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          onClick={() => openCancelModal(event)}
                          aria-label={`Cancelar evento ${event.title}`}
                        >
                          Cancelar evento
                        </Button>
                      </Group>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>

        {!loading && events.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            Todavía no hay eventos publicados.
          </Text>
        )}

        {loading && (
          <Text c="dimmed" ta="center" py="xl">
            Cargando eventos...
          </Text>
        )}
      </Card>
    </Box>
  );
}
