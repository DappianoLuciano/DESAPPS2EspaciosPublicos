import { Container, Title, Text, Card, SimpleGrid, Flex, Box, Table, Badge, ActionIcon, Button } from '@mantine/core';
import { IconChartBar, IconUsers, IconEdit, IconTrash, IconEye } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const events = [
    { id: 1, title: 'Festival de Arte Urbano 2024', category: 'Arte', date: '15 Oct 2024', status: 'Activo' },
    { id: 2, title: 'BA Tech Summit 2024', category: 'Tecnología', date: '20 Oct 2024', status: 'Reprogramado' },
    { id: 3, title: 'Jazz en el Parque', category: 'Música', date: '12 Oct 2024', status: 'Cancelado' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Activo': return <Badge color="green" variant="light">Activo</Badge>;
      case 'Reprogramado': return <Badge color="blue" variant="light">Reprogramado</Badge>;
      case 'Cancelado': return <Badge color="red" variant="light">Cancelado</Badge>;
      default: return <Badge color="gray">{status}</Badge>;
    }
  };

  return (
    <Container size="xl" py={40}>
      <Flex justify="space-between" align="center" mb="xl">
        <Box>
          <Title order={1} fz={32}>Panel Admin</Title>
          <Text c="dimmed">Resumen de actividad e impacto en la ciudad.</Text>
        </Box>
        <Button onClick={() => navigate('/admin/create-event')} color="blue">
          + Nuevo Evento
        </Button>
      </Flex>

      <SimpleGrid cols={3} spacing="lg" mb={40}>
        <Card shadow="sm" radius="md" withBorder p="xl">
          <Flex justify="space-between" align="flex-start">
            <Box>
              <Text c="dimmed" fw={600} tt="uppercase" fz="sm">Eventos Activos</Text>
              <Title order={2} fz={40} mt="sm">124</Title>
              <Text c="green" fz="sm" fw={500} mt="xs">+12% este mes</Text>
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
              <Title order={2} fz={40} mt="sm">8.5k</Title>
              <Text c="dimmed" fz="sm" mt="xs">Personas alcanzadas</Text>
            </Box>
            <Box bg="blue.1" p="sm" style={{ borderRadius: '50%' }}>
              <IconUsers color="blue" size="1.5rem" />
            </Box>
          </Flex>
        </Card>
      </SimpleGrid>

      <Card shadow="sm" radius="md" withBorder p={0}>
        <Box p="xl" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <Title order={3} fz={20}>Gestión de Eventos</Title>
        </Box>
        <Table verticalSpacing="md" horizontalSpacing="xl" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Evento</Table.Th>
              <Table.Th>Categoría</Table.Th>
              <Table.Th>Fecha</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.map((ev) => (
              <Table.Tr key={ev.id}>
                <Table.Td fw={600}>{ev.title}</Table.Td>
                <Table.Td>{ev.category}</Table.Td>
                <Table.Td>{ev.date}</Table.Td>
                <Table.Td>{getStatusBadge(ev.status)}</Table.Td>
                <Table.Td>
                  <Flex gap="xs">
                    <ActionIcon variant="subtle" color="gray"><IconEye size="1rem" /></ActionIcon>
                    <ActionIcon variant="subtle" color="blue"><IconEdit size="1rem" /></ActionIcon>
                    <ActionIcon variant="subtle" color="red"><IconTrash size="1rem" /></ActionIcon>
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
