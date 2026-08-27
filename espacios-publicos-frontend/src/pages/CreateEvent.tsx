import { Alert, Box, Button, Card, Container, Flex, Select, SimpleGrid, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCommunityEvent, listPublicSpaces } from '../lib/api';
import type { PublicSpace } from '../lib/api';

export default function CreateEvent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [publicSpaces, setPublicSpaces] = useState<PublicSpace[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [publicSpaceId, setPublicSpaceId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listPublicSpaces()
      .then(setPublicSpaces)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingSpaces(false));
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      if (!title || !category || !publicSpaceId || !description || !startDate || !capacity) {
        throw new Error('Completá los campos obligatorios para crear el evento.');
      }

      await createCommunityEvent({
        title,
        category,
        description,
        publicSpaceId,
        organizerName: 'Gestión Municipal',
        organizerProfileEnabled: true,
        capacity: Number(capacity),
        requiresRegistration: true,
        startDate: new Date(`${startDate}T09:00:00`).toISOString(),
        endDate: new Date(`${endDate || startDate}T18:00:00`).toISOString(),
        imageUrl: null,
      });

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el evento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="md" py={40}>
      <Title order={1} fz={32} mb="xs">
        {isEditMode ? 'Editar Evento' : 'Crear Nuevo Evento'}
      </Title>
      <Text c="dimmed" mb={40}>
        {isEditMode 
          ? 'Modifique los detalles del evento comunitario.' 
          : 'Complete los detalles para registrar un nuevo evento comunitario en el espacio público.'}
      </Text>

      {error && (
        <Alert color="red" mb="lg">
          {error}
        </Alert>
      )}

      <SimpleGrid cols={12} spacing="xl">
        <Box style={{ gridColumn: 'span 8' }}>
          <Card withBorder shadow="sm" radius="md" p="xl">
            <Title order={3} fz={20} mb="xl" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              Detalles Generales
            </Title>
            
            <TextInput
              label="Título del Evento"
              placeholder="Ej: Festival de Arte Urbano"
              required
              mb="lg"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />

            <SimpleGrid cols={2} mb="lg">
              <Select
                label="Categoría"
                placeholder="Seleccione categoría"
                data={['Música', 'Arte', 'Tecnología', 'Gastronomía', 'Teatro']}
                value={category}
                onChange={setCategory}
                required
              />
              <Select
                label="Espacio Público"
                placeholder="Seleccione ubicación"
                data={publicSpaces.map((space) => ({
                  value: space.id,
                  label: `${space.name} (${space.zone || 'Sin zona'})`,
                }))}
                disabled={loadingSpaces || publicSpaces.length === 0}
                value={publicSpaceId}
                onChange={setPublicSpaceId}
                required
              />
            </SimpleGrid>

            <Textarea
              label="Descripción"
              placeholder="Detalles sobre las actividades, artistas, etc."
              minRows={4}
              required
              mb="lg"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
          </Card>
        </Box>

        <Box style={{ gridColumn: 'span 4' }}>
          <Card withBorder shadow="sm" radius="md" p="xl" mb="xl">
            <Title order={3} fz={20} mb="xl" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              Fechas
            </Title>
            
            <TextInput
              label="Fecha de Inicio"
              type="date"
              required
              mb="md"
              value={startDate}
              onChange={(event) => setStartDate(event.currentTarget.value)}
            />
            <TextInput
              label="Fecha de Fin"
              type="date"
              mb="md"
              value={endDate}
              onChange={(event) => setEndDate(event.currentTarget.value)}
            />
          </Card>

          <Card withBorder shadow="sm" radius="md" p="xl">
            <Title order={3} fz={20} mb="xl" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              Aforo
            </Title>
            
            <TextInput
              label="Capacidad Máxima"
              type="number"
              placeholder="Ej: 500"
              value={capacity}
              onChange={(event) => setCapacity(event.currentTarget.value)}
              required
            />
          </Card>
        </Box>
      </SimpleGrid>

      <Flex justify="flex-end" gap="md" mt={40}>
        <Button variant="default" onClick={() => navigate('/admin')}>Cancelar</Button>
        <Button color="blue" onClick={handleSubmit} loading={submitting}>
          {isEditMode ? 'Guardar Cambios' : 'Crear Evento'}
        </Button>
      </Flex>
    </Container>
  );
}
