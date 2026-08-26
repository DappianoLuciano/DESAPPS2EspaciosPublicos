import { Container, Title, Text, Card, SimpleGrid, Flex, Box, Table, Badge, ActionIcon, Modal, Button, Menu } from '@mantine/core';
import { IconCalendarEvent, IconPlayerPlay, IconUsersGroup, IconEdit, IconTrash, IconFileDescription, IconChevronDown } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function EventManagement() {
  const [events, setEvents] = useState([
    { id: 1, title: 'Festival de Jazz de Verano', date: '15 Ago, 2024', status: 'Activo' },
    { id: 2, title: 'Taller de Pintura Urbana', date: '22 Ago, 2024', status: 'Borrador' },
    { id: 3, title: 'Maratón Nocturna 10K', date: '05 Jul, 2024', status: 'Finalizado' },
  ]);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);

  const confirmDelete = (id: number) => {
    setEventToDelete(id);
    openDeleteModal();
  };

  const handleDelete = () => {
    if (eventToDelete !== null) {
      setEvents(events.filter(ev => ev.id !== eventToDelete));
    }
    closeDeleteModal();
  };

  const changeStatus = (id: number, newStatus: string) => {
    setEvents(events.map(ev => ev.id === id ? { ...ev, status: newStatus } : ev));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Activo': return <Badge color="green" variant="light" style={{ cursor: 'pointer' }}>Activo <IconChevronDown size="0.8rem" style={{ marginLeft: 4 }} /></Badge>;
      case 'Borrador': return <Badge color="gray" variant="light" style={{ cursor: 'pointer' }}>Borrador <IconChevronDown size="0.8rem" style={{ marginLeft: 4 }} /></Badge>;
      case 'Finalizado': return <Badge color="gray" variant="light" style={{ cursor: 'pointer' }}>Finalizado <IconChevronDown size="0.8rem" style={{ marginLeft: 4 }} /></Badge>;
      default: return <Badge color="gray" style={{ cursor: 'pointer' }}>{status}</Badge>;
    }
  };

  return (
    <>
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Eliminar Evento" centered>
        <Text size="sm" mb="xl">
          ¿Estás seguro que deseas eliminar este evento? Esta acción no se puede deshacer y los inscriptos serán notificados.
        </Text>
        <Flex justify="flex-end" gap="sm">
          <Button variant="default" onClick={closeDeleteModal}>Cancelar</Button>
          <Button color="red" onClick={handleDelete}>Eliminar</Button>
        </Flex>
      </Modal>

      <Container size="xl" py={40}>
        <Box mb={40}>
          <Title order={1} fz={32} mb="xs">Gestión de Eventos</Title>
          <Text c="dimmed">Administra y supervisa todos los eventos y actividades municipales.</Text>
        </Box>

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
                <Title order={2} fz={32} mt={4}>{events.filter(e => e.status === 'Activo').length}</Title>
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
          <Box style={{ overflowX: 'auto' }}>
            <Table verticalSpacing="md" horizontalSpacing="xl" striped style={{ minWidth: 600 }}>
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
                    <Table.Td>
                      <Menu shadow="md" width={150}>
                        <Menu.Target>
                          <Box style={{ display: 'inline-block' }}>
                            {getStatusBadge(ev.status)}
                          </Box>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item onClick={() => changeStatus(ev.id, 'Borrador')}>Borrador</Menu.Item>
                          <Menu.Item onClick={() => changeStatus(ev.id, 'Activo')}>Activo</Menu.Item>
                          <Menu.Item onClick={() => changeStatus(ev.id, 'Finalizado')}>Finalizado</Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                    <Table.Td>
                      <Flex gap="xs">
                        <ActionIcon component={Link} to={`/admin/event/${ev.id}/edit`} variant="subtle" color="blue">
                          <IconEdit size="1.2rem" />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => confirmDelete(ev.id)}>
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
          </Box>
        </Card>
      </Container>
    </>
  );
}
