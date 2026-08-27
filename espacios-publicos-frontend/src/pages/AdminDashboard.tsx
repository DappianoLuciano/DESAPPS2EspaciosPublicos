import { Alert, Box, Button, Card, Flex, SimpleGrid, Table, Text, Title, Badge } from '@mantine/core';
import { IconChartBar, IconUsers } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { listCommunityEvents } from '../lib/api';
import type { CommunityEventCatalogItem } from '../lib/api';

export default function AdminDashboard() {
  const [events, setEvents] = useState<CommunityEventCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCommunityEvents()
      .then((response) => setEvents(response.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeEvents = events.filter((event) => event.status === 'ACTIVE').length;
  const estimatedReach = useMemo(
    () => events.reduce((total, event) => total + event.capacity, 0),
    [events]
  );
  const recentEvents = events.slice(0, 5);

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
    <ContainerShim>
      <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="md" mb="xl">
        <Box>
          <Title order={1} fz={32}>Panel Admin</Title>
          <Text c="dimmed">Resumen de actividad e impacto de los eventos comunitarios.</Text>
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

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb={40}>
        <Card shadow="sm" radius="md" withBorder p="xl">
          <Flex justify="space-between" align="flex-start">
            <Box>
              <Text c="dimmed" fw={600} tt="uppercase" fz="sm">Eventos Activos</Text>
              <Title order={2} fz={40} mt="sm">{activeEvents}</Title>
              <Text c="dimmed" fz="sm" mt="xs">{events.length} eventos publicados</Text>
            </Box>
            <Box bg="blue.1" p="sm" style={{ borderRadius: '50%' }}>
              <IconChartBar color="blue" size="1.5rem" />
            </Box>
          </Flex>
        </Card>

        <Card shadow="sm" radius="md" withBorder p="xl">
          <Flex justify="space-between" align="flex-start">
            <Box>
              <Text c="dimmed" fw={600} tt="uppercase" fz="sm">Impacto Estimado</Text>
              <Title order={2} fz={40} mt="sm">{estimatedReach}</Title>
              <Text c="dimmed" fz="sm" mt="xs">Cupos disponibles para la comunidad</Text>
            </Box>
            <Box bg="blue.1" p="sm" style={{ borderRadius: '50%' }}>
              <IconUsers color="blue" size="1.5rem" />
            </Box>
          </Flex>
        </Card>
      </SimpleGrid>

      <Card shadow="sm" radius="md" withBorder p={0}>
        <Flex justify="space-between" align="center" p="xl" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <Title order={3} fz={20}>Gestión de Eventos</Title>
          <Button component={Link} to="/admin/events" variant="subtle" size="sm">
            Ver más
          </Button>
        </Flex>
        <Box style={{ overflowX: 'auto' }}>
          <Table verticalSpacing="md" horizontalSpacing="xl" striped style={{ minWidth: 640 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Evento</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Estado</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentEvents.map((event) => (
                <Table.Tr key={event.id}>
                  <Table.Td fw={600}>{event.title}</Table.Td>
                  <Table.Td>{event.category}</Table.Td>
                  <Table.Td>{formatDate(event.startDate)}</Table.Td>
                  <Table.Td>{getStatusBadge(event.status)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>

        {!loading && recentEvents.length === 0 && (
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
    </ContainerShim>
  );
}

function ContainerShim({ children }: { children: ReactNode }) {
  return (
    <Box px={{ base: 'md', md: 40 }} py={40}>
      {children}
    </Box>
  );
}
