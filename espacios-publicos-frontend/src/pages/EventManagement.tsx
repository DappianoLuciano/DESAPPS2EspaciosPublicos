import { Container, Title, Text, Card, SimpleGrid, Flex, Box, Table, Badge, ActionIcon } from '@mantine/core';
import { IconCalendarEvent, IconPlayerPlay, IconUsersGroup, IconEdit, IconTrash, IconFileDescription } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export default function EventManagement() {
  const events = [
    { id: 1, title: 'Festival de Jazz de Verano', date: '15 Ago, 2024', status: 'Activo' },
    { id: 2, title: 'Taller de Pintura Urbana', date: '22 Ago, 2024', status: 'Borrador' },
    { id: 3, title: 'Maratón Nocturna 10K', date: '05 Jul, 2024', status: 'Finalizado' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Activo': return <Badge color="green" variant="light">Activo</Badge>;
      case 'Borrador': return <Badge color="gray" variant="light">Borrador</Badge>;
      case 'Finalizado': return <Badge color="gray" variant="light">Finalizado</Badge>;
      default: return <Badge color="gray">{status}</Badge>;
    }
  };

  return (
    <Container size="xl" py={40}>
      <Box mb={40}>
        <Title order={1} fz={32} mb="xs">Gestión de Eventos</Title>
        <Text c="dimmed">Administra y supervisa todos los eventos y actividades municipales.</Text>
      </Box>

      <SimpleGrid cols={3} spacing="lg" mb={40}>
        <Card shadow="sm" radius="md" withBorder p="xl">
          <Flex align="center" gap="lg">
            <Box bg="gray.1" p="md" style={{ borderRadius: '50%' }}>
              <IconCalendarEvent color="gray" size="1.5rem" />
            </Box>
            <Box>
              <Text c="dimmed" fw={600} tt="uppercase" fz="xs">TOTAL EVENTOS</Text>
              <Title order={2} fz={32} mt={4}>1,248</Title>
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
              <Title order={2} fz={32} mt={4}>42</Title>
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
              <Title order={2} fz={32} mt={4}>8,500</Title>
            </Box>
          </Flex>
        </Card>
      </SimpleGrid>

      <Card shadow="sm" radius="md" withBorder p={0}>
        <Table verticalSpacing="md" horizontalSpacing="xl" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>NOMBRE DEL EVENTO</Table.Th>
              <Table.Th>FECHA</Table.Th>
              <Table.Th>ESTADO</Table.Th>
              <Table.Th>ACCIONES</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.map((ev) => (
              <Table.Tr key={ev.id}>
                <Table.Td fw={600}>{ev.title}</Table.Td>
                <Table.Td>{ev.date}</Table.Td>
                <Table.Td>{getStatusBadge(ev.status)}</Table.Td>
                <Table.Td>
                  <Flex gap="xs">
                    <ActionIcon component={Link} to={`/admin/event/${ev.id}/edit`} variant="subtle" color="blue">
                      <IconEdit size="1.2rem" />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red">
                      <IconTrash size="1.2rem" />
                    </ActionIcon>
                    <ActionIcon component={Link} to={`/admin/event/${ev.id}/attendees`} variant="subtle" color="blue">
                      <IconFileDescription size="1.2rem" />
                    </ActionIcon>
                  </Flex>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Container>
  );
}
