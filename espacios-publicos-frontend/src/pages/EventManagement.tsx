import { Alert, Box, Button, Card, Flex, SimpleGrid, Table, Text, Title, Badge, ActionIcon } from '@mantine/core';
import { IconCalendarEvent, IconEye, IconPlayerPlay, IconUsersGroup } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCommunityEvents } from '../lib/api';
import type { CommunityEventCatalogItem } from '../lib/api';

export default function EventManagement() {
  const [events, setEvents] = useState<CommunityEventCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      default:
        return <Badge color="gray" variant="light">Sin estado</Badge>;
    }
  };

  return (
    <Box px={{ base: 'md', md: 40 }} py={40}>
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
                  <Table.Td>{getStatusBadge(event.status)}</Table.Td>
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
