import { Alert, Badge, Box, Button, Card, Flex, Group, Modal, NumberInput, Select, Table, Text, TextInput, Textarea, Title, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconMapPin, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { createPublicSpace, deletePublicSpace, listPublicSpaces, updatePublicSpace } from '../lib/api';
import type { PublicSpace, PublicSpacePayload } from '../lib/api';

const emptyForm: PublicSpacePayload = {
  name: '',
  description: '',
  address: '',
  zone: '',
  capacity: 1,
  status: 'ENABLED',
  imageUrl: '',
};

export default function PublicSpaceManagement() {
  const [spaces, setSpaces] = useState<PublicSpace[]>([]);
  const [form, setForm] = useState<PublicSpacePayload>(emptyForm);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);

  const loadSpaces = () => {
    setLoading(true);
    listPublicSpaces()
      .then(setSpaces)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSpaces();
  }, []);

  const openCreateModal = () => {
    setEditingSpaceId(null);
    setForm(emptyForm);
    setError(null);
    open();
  };

  const openEditModal = (space: PublicSpace) => {
    setEditingSpaceId(space.id);
    setForm({
      name: space.name,
      description: space.description,
      address: space.address,
      zone: space.zone || '',
      capacity: space.capacity,
      status: space.status,
      imageUrl: space.imageUrl || '',
    });
    setError(null);
    open();
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      if (!form.name || !form.description || !form.address || !form.zone || !form.capacity) {
        throw new Error('Completá nombre, descripción, dirección, zona y capacidad.');
      }

      const payload = {
        ...form,
        imageUrl: form.imageUrl || null,
      };

      if (editingSpaceId) {
        await updatePublicSpace(editingSpaceId, payload);
      } else {
        await createPublicSpace(payload);
      }

      close();
      loadSpaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el espacio público.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (space: PublicSpace) => {
    setError(null);

    try {
      await updatePublicSpace(space.id, {
        name: space.name,
        description: space.description,
        address: space.address,
        zone: space.zone || '',
        capacity: space.capacity,
        status: space.status === 'ENABLED' ? 'DISABLED' : 'ENABLED',
        imageUrl: space.imageUrl || null,
      });
      loadSpaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    }
  };

  const handleDelete = async (space: PublicSpace) => {
    setError(null);

    try {
      await deletePublicSpace(space.id);
      loadSpaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar. Si tiene eventos o reservas, deshabilitalo.');
    }
  };

  return (
    <Container size="xl" py={40}>
      <Modal opened={opened} onClose={close} title={editingSpaceId ? 'Editar Espacio Público' : 'Nuevo Espacio Público'} centered size="lg">
        <Flex direction="column" gap="md">
          {error && <Alert color="red">{error}</Alert>}
          <TextInput
            label="Nombre"
            placeholder="Ej: Parque Centenario"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
          />
          <TextInput
            label="Dirección exacta"
            placeholder="Ej: Av. Díaz Vélez 4800, CABA"
            required
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.currentTarget.value })}
          />
          <TextInput
            label="Zona / barrio"
            placeholder="Ej: Caballito"
            required
            value={form.zone}
            onChange={(event) => setForm({ ...form, zone: event.currentTarget.value })}
          />
          <Textarea
            label="Descripción"
            placeholder="Características del espacio y usos permitidos"
            minRows={3}
            required
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.currentTarget.value })}
          />
          <NumberInput
            label="Capacidad máxima"
            min={1}
            required
            value={form.capacity}
            onChange={(value) => setForm({ ...form, capacity: Number(value) || 1 })}
          />
          <Select
            label="Estado"
            data={[
              { value: 'ENABLED', label: 'Habilitado' },
              { value: 'DISABLED', label: 'Deshabilitado / en obra' },
            ]}
            value={form.status}
            onChange={(value) => setForm({ ...form, status: value as PublicSpacePayload['status'] })}
          />
          <TextInput
            label="Imagen URL"
            placeholder="https://..."
            value={form.imageUrl || ''}
            onChange={(event) => setForm({ ...form, imageUrl: event.currentTarget.value })}
          />
          <Flex justify="flex-end" gap="sm" mt="md">
            <Button variant="default" onClick={close}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={submitting}>Guardar</Button>
          </Flex>
        </Flex>
      </Modal>

      <Flex justify="space-between" align="center" mb="xl">
        <Box>
          <Title order={1} fz={32}>Espacios Públicos</Title>
          <Text c="dimmed">Administrá ubicaciones disponibles para eventos comunitarios.</Text>
        </Box>
        <Button leftSection={<IconPlus size="1rem" />} onClick={openCreateModal}>
          Nuevo Espacio
        </Button>
      </Flex>

      {error && !opened && (
        <Alert color="red" mb="lg">
          {error}
        </Alert>
      )}

      <Card shadow="sm" radius="md" withBorder p={0}>
        <Table verticalSpacing="md" horizontalSpacing="xl" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Dirección</Table.Th>
              <Table.Th>Zona</Table.Th>
              <Table.Th>Capacidad</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading && (
              <Table.Tr>
                <Table.Td colSpan={6}>Cargando espacios...</Table.Td>
              </Table.Tr>
            )}
            {!loading && spaces.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>Todavía no hay espacios públicos cargados.</Table.Td>
              </Table.Tr>
            )}
            {spaces.map((space) => (
              <Table.Tr key={space.id}>
                <Table.Td>
                  <Group gap="xs">
                    <IconMapPin size="1rem" color="gray" />
                    <Text fw={600}>{space.name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>{space.address}</Table.Td>
                <Table.Td>{space.zone || '-'}</Table.Td>
                <Table.Td>{space.capacity}</Table.Td>
                <Table.Td>
                  <Badge color={space.status === 'ENABLED' ? 'green' : 'red'} variant="light">
                    {space.status === 'ENABLED' ? 'Habilitado' : 'Deshabilitado'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Flex gap="xs">
                    <Button size="xs" variant="light" leftSection={<IconEdit size="0.9rem" />} onClick={() => openEditModal(space)}>
                      Editar
                    </Button>
                    <Button size="xs" variant="light" color={space.status === 'ENABLED' ? 'red' : 'green'} onClick={() => handleToggleStatus(space)}>
                      {space.status === 'ENABLED' ? 'Deshabilitar' : 'Habilitar'}
                    </Button>
                    <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size="0.9rem" />} onClick={() => handleDelete(space)}>
                      Eliminar
                    </Button>
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
