import { Alert, Box, Button, Card, Container, Flex, Select, SimpleGrid, Text, Textarea, TextInput, Title } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCommunityEvent, listPublicSpaces, uploadEventImage } from '../lib/api';
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
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listPublicSpaces({ status: 'ENABLED' })
      .then(setPublicSpaces)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingSpaces(false));
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleImageDrop = async (files: File[]) => {
    const file = files[0];

    if (!file) {
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setError(null);
    setUploadingImage(true);
    setImagePreviewUrl(URL.createObjectURL(file));

    try {
      const response = await uploadEventImage(file);
      setImageUrl(response.imageUrl);
    } catch (err) {
      setImageUrl('');
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      if (!title || !category || !publicSpaceId || !description || !startDate || !capacity) {
        throw new Error('Completá los campos obligatorios para crear el evento.');
      }

      if (uploadingImage) {
        throw new Error('Esperá a que termine de subir la imagen.');
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
        imageUrl: imageUrl || null,
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

            <Text fw={600} mb={6}>Imagen del evento</Text>
            <Dropzone
              onDrop={handleImageDrop}
              onReject={() => setError('La imagen debe ser JPG, PNG o WEBP y pesar hasta 5MB.')}
              maxSize={5 * 1024 ** 2}
              accept={IMAGE_MIME_TYPE}
              loading={uploadingImage}
              mb="md"
            >
              <Flex align="center" justify="center" gap="md" mih={120}>
                <Dropzone.Accept>
                  <IconUpload size="2rem" color="var(--mantine-color-blue-6)" />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size="2rem" color="var(--mantine-color-red-6)" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconPhoto size="2rem" color="var(--mantine-color-gray-6)" />
                </Dropzone.Idle>
                <Box>
                  <Text fw={700}>Arrastrá una imagen o hacé click para seleccionarla</Text>
                  <Text size="sm" c="dimmed">JPG, PNG o WEBP hasta 5MB</Text>
                </Box>
              </Flex>
            </Dropzone>

            {imagePreviewUrl && (
              <Box
                h={180}
                style={{
                  borderRadius: 8,
                  backgroundImage: `url(${imagePreviewUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid #E2E8F0',
                }}
              />
            )}
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
