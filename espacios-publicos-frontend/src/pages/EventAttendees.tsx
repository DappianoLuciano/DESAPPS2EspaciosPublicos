import { Alert, Anchor, Avatar, Box, Button, Card, Center, Flex, Pagination, Progress, Table, Text, TextInput, Title } from '@mantine/core';
import { IconArrowLeft, IconDownload, IconPrinter, IconSearch, IconUsersGroup } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCommunityEvent, listCommunityEventRegistrations } from '../lib/api';
import type { CommunityEventCatalogItem, CommunityEventRegistration } from '../lib/api';

export default function EventAttendees() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [event, setEvent] = useState<CommunityEventCatalogItem | null>(null);
  const [attendees, setAttendees] = useState<CommunityEventRegistration[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No se encontró el evento seleccionado.');
      setLoading(false);
      return;
    }

    Promise.all([
      getCommunityEvent(id),
      listCommunityEventRegistrations(id),
    ])
      .then(([eventResponse, registrationsResponse]) => {
        setEvent(eventResponse);
        setAttendees(registrationsResponse);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const filteredAttendees = useMemo(() => (
    attendees.filter((person) => {
      const query = search.toLowerCase().trim();

      if (!query) {
        return true;
      }

      return (
        person.citizenName.toLowerCase().includes(query) ||
        person.citizenEmail.toLowerCase().includes(query)
      );
    })
  ), [attendees, search]);

  const formatDateTime = (date: string) => (
    new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  );

  const getInitials = (name: string) => (
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  );

  const progressValue = event ? (attendees.length / event.capacity) * 100 : 0;

  return (
    <Box px={{ base: 'md', md: 40 }} py={40}>
      <Anchor
        component="button"
        onClick={() => navigate('/admin/events')}
        c="dimmed"
        size="sm"
        mb="md"
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <IconArrowLeft size="1rem" /> Volver a eventos
      </Anchor>

      <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="md" mb={40}>
        <Box>
          <Title order={1} fz={32} mb={4}>Gestión de Inscriptos</Title>
          <Text c="dimmed" size="lg">{event?.title || 'Evento comunitario'}</Text>
        </Box>
        <Flex gap="sm">
          <Button variant="default" leftSection={<IconPrinter size="1rem" />}>Imprimir</Button>
          <Button color="dark" leftSection={<IconDownload size="1rem" />}>Descargar CSV</Button>
        </Flex>
      </Flex>

      {error && (
        <Alert color="red" mb="lg">
          {error}
        </Alert>
      )}

      <Center mb={40}>
        <Card withBorder shadow="sm" radius="md" p="xl" w={320}>
          <Flex align="center" gap="xs" mb="sm" c="dimmed">
            <IconUsersGroup size="1.2rem" />
            <Text fw={700} size="xs" tt="uppercase">TOTAL INSCRIPTOS</Text>
          </Flex>
          <Flex align="baseline" gap="xs" mb="lg">
            <Title order={2} fz={40}>{attendees.length}</Title>
            <Text c="dimmed">/ {event?.capacity || 0} cupos</Text>
          </Flex>
          <Progress value={progressValue} color="dark" size="md" radius="xl" />
        </Card>
      </Center>

      <Card withBorder shadow="sm" radius="md" p={0}>
        <Box p="md" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <TextInput
            placeholder="Buscar por nombre o email..."
            leftSection={<IconSearch size="1rem" />}
            variant="default"
            w={{ base: '100%', sm: 320 }}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </Box>

        <Box style={{ overflowX: 'auto' }}>
          <Table verticalSpacing="md" horizontalSpacing="lg" striped style={{ minWidth: 640 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>CIUDADANO</Table.Th>
                <Table.Th>CONTACTO</Table.Th>
                <Table.Th>FECHA DE RESERVA</Table.Th>
                <Table.Th>ID RESERVA</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredAttendees.map((person) => (
                <Table.Tr key={person.id}>
                  <Table.Td>
                    <Flex align="center" gap="sm">
                      <Avatar color="blue" radius="xl">{getInitials(person.citizenName)}</Avatar>
                      <Text fw={600} size="sm">{person.citizenName}</Text>
                    </Flex>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{person.citizenEmail}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDateTime(person.createdAt)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{person.id}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>

        {!loading && filteredAttendees.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No hay inscriptos para mostrar.
          </Text>
        )}

        {loading && (
          <Text c="dimmed" ta="center" py="xl">
            Cargando inscriptos...
          </Text>
        )}

        <Flex justify="space-between" align="center" p="md" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Text size="sm" c="dimmed">
            Mostrando {filteredAttendees.length} de {attendees.length} inscriptos
          </Text>
          <Pagination total={1} value={1} size="sm" />
        </Flex>
      </Card>
    </Box>
  );
}
