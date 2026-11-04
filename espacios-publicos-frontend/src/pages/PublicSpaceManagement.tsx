import { Alert, Badge, Box, Button, Card, Flex, Group, Modal, NumberInput, Select, Table, Text, TextInput, Textarea, Title, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconMapPin, IconPhoto, IconPlus, IconTrash } from '@tabler/icons-react';
import { Dropzone } from '@mantine/dropzone';
import { useEffect, useRef, useState } from 'react';
import { createPublicSpace, deletePublicSpace, listPublicSpaces, updatePublicSpace, uploadPublicSpaceImage } from '../lib/api';
import type { PublicSpace, PublicSpacePayload } from '../lib/api';
import LocationPicker from '../components/LocationPicker';
import type { Coordinates } from '../components/LocationPicker';
import { createAddressSearch } from '../lib/addressSearch';
import type { AddressMatch } from '../lib/addressSearch';

const searchAddress = createAddressSearch();

const emptyForm: PublicSpacePayload = {
  name: '',
  description: '',
  address: '',
  zone: '',
  capacity: 1,
  latitude: null,
  longitude: null,
  status: 'ENABLED',
  exposure: 'MIXED',
  imageUrl: '',
};

function coordinatesOf(form: PublicSpacePayload): Coordinates | null {
  return typeof form.latitude === 'number' && typeof form.longitude === 'number'
    ? { latitude: form.latitude, longitude: form.longitude }
    : null;
}

export default function PublicSpaceManagement() {
  const [spaces, setSpaces] = useState<PublicSpace[]>([]);
  const [form, setForm] = useState<PublicSpacePayload>(emptyForm);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);

  const [addressOptions, setAddressOptions] = useState<AddressMatch[]>([]);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const addressRequest = useRef<AbortController | null>(null);

  useEffect(() => () => addressRequest.current?.abort(), []);

  const resetAddressSearch = () => {
    addressRequest.current?.abort();
    addressRequest.current = null;
    setAddressOptions([]);
    setSelectedAddress(null);
    setLocatingAddress(false);
    setAddressError(null);
  };

  const applyAddress = (match: AddressMatch) => {
    setSelectedAddress(match.id);
    setAddressError(null);
    setForm(previous => ({ ...previous, address: match.label, zone: match.zone,
      latitude: match.latitude, longitude: match.longitude }));
  };

  const locateAddress = async () => {
    if (locatingAddress || submitting) return;
    addressRequest.current?.abort();
    const controller = new AbortController();
    addressRequest.current = controller;
    setLocatingAddress(true);
    setAddressError(null);
    setAddressOptions([]);
    setSelectedAddress(null);
    setForm(previous => ({ ...previous, latitude: null, longitude: null, zone: '' }));
    try {
      const matches = await searchAddress(form.address, controller.signal,
        import.meta.env.VITE_GEOCODING_URL?.trim() || undefined);
      if (controller.signal.aborted) return;
      setAddressOptions(matches);
      if (matches.length === 1) applyAddress(matches[0]);
      else if (matches.length === 0) setAddressError('No encontramos esa dirección. Agregá la localidad o provincia y volvé a buscar.');
    } catch (err) {
      if (!controller.signal.aborted) setAddressError(err instanceof Error ? err.message : 'No se pudo ubicar la dirección.');
    } finally {
      if (addressRequest.current === controller) setLocatingAddress(false);
    }
  };

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
    resetAddressSearch();
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
      latitude: space.latitude ?? null,
      longitude: space.longitude ?? null,
      status: space.status,
      exposure: space.exposure || 'MIXED',
      imageUrl: space.imageUrl || '',
    });
    resetAddressSearch();
    setError(null);
    open();
  };

  const handleSubmit = async () => {
    if (uploadingImage || submitting || locatingAddress) return;
    setError(null);
    setSubmitting(true);

    try {
      if (!form.name || !form.description || !form.address || !form.zone || !form.capacity) {
        throw new Error('Completá nombre, descripción, dirección, zona y capacidad.');
      }

      // Sin coordenadas el espacio no puede recibir eventos: Movilidad las
      // necesita para recomendar estaciones cercanas (CU-INT-01).
      if (!coordinatesOf(form)) {
        throw new Error('Ubicá la dirección y, si hay varias coincidencias, seleccioná la correcta de la lista.');
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

  const handleImageDrop = async (files: File[]) => {
    const file = files[0];
    if (!file || uploadingImage || submitting) return;

    setError(null);
    setUploadingImage(true);
    try {
      const { imageUrl } = await uploadPublicSpaceImage(file);
      setForm(previous => ({ ...previous, imageUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    } finally {
      setUploadingImage(false);
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
        exposure: space.exposure || 'MIXED',
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
      <Modal opened={opened} onClose={() => { if (!uploadingImage && !submitting) close(); }} closeButtonProps={{ disabled: uploadingImage || submitting }} title={editingSpaceId ? 'Editar Espacio Público' : 'Nuevo Espacio Público'} centered size="lg">
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
            description="Ingresá calle, altura y localidad. Después presioná «Ubicar dirección»."
            placeholder="Ej: Lima 123, Ciudad Autónoma de Buenos Aires"
            required
            disabled={submitting}
            value={form.address}
            error={addressError}
            onChange={(event) => {
              const address = event.currentTarget.value;
              resetAddressSearch();
              setForm(previous => ({ ...previous, address, latitude: null, longitude: null, zone: '' }));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void locateAddress();
              }
            }}
          />
          <Button variant="light" onClick={() => void locateAddress()} loading={locatingAddress}
            disabled={submitting || form.address.trim().length < 3} leftSection={<IconMapPin size={16} />}>
            Ubicar dirección
          </Button>
          {addressOptions.length > 1 && (
            <Select label="Direcciones encontradas" placeholder="Elegí la dirección correcta"
              description="Hay varias coincidencias. El mapa se ubicará al seleccionar una."
              data={addressOptions.map(match => ({ value: match.id, label: match.label }))}
              value={selectedAddress} disabled={submitting}
              onChange={value => {
                const match = addressOptions.find(option => option.id === value);
                if (match) applyAddress(match);
              }} />
          )}
          <LocationPicker value={coordinatesOf(form)} />
          <TextInput
            label="Zona / barrio"
            description="Se completa desde la dirección encontrada. Podés corregir el nombre si fuera necesario."
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
          <Select
            label="Exposición climática"
            description="Se usa para bloquear reservas durante contingencias climáticas."
            data={[
              { value: 'INDOOR', label: 'Interior' },
              { value: 'OUTDOOR', label: 'Exterior' },
              { value: 'MIXED', label: 'Mixto' },
            ]}
            value={form.exposure}
            onChange={(value) => setForm({ ...form, exposure: value as PublicSpacePayload['exposure'] })}
          />
          <Box>
            <Text fw={600} mb={6}>Imagen del espacio público</Text>
            <Dropzone
              onDrop={handleImageDrop}
              onReject={() => setError('Seleccioná una sola imagen JPG, PNG o WEBP de hasta 5 MB.')}
              accept={['image/jpeg', 'image/png', 'image/webp']}
              maxSize={5 * 1024 ** 2}
              maxFiles={1}
              multiple={false}
              loading={uploadingImage}
              disabled={submitting}
            >
              <Flex align="center" justify="center" gap="md" mih={110} style={{ pointerEvents: 'none' }}>
                <IconPhoto size={32} />
                <Box>
                  <Text fw={600}>Arrastrá una imagen o hacé clic para seleccionarla</Text>
                  <Text size="sm" c="dimmed">JPG, PNG o WEBP hasta 5 MB</Text>
                </Box>
              </Flex>
            </Dropzone>
            {form.imageUrl && (
              <Box mt="sm">
                <img src={form.imageUrl} alt="Vista previa del espacio público" style={{ display: 'block', width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }} />
                <Button mt="xs" variant="subtle" color="red" size="xs" disabled={uploadingImage || submitting} onClick={() => setForm(previous => ({ ...previous, imageUrl: '' }))}>
                  Quitar imagen
                </Button>
              </Box>
            )}
          </Box>
          <Flex justify="flex-end" gap="sm" mt="md">
            <Button variant="default" onClick={close} disabled={uploadingImage || submitting}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={uploadingImage || locatingAddress}>Guardar</Button>
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
        <Table.ScrollContainer minWidth={640}>
        <Table verticalSpacing="md" horizontalSpacing="xl" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Dirección</Table.Th>
              <Table.Th>Zona</Table.Th>
              <Table.Th>Capacidad</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Exposición</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading && (
              <Table.Tr>
                <Table.Td colSpan={7}>Cargando espacios...</Table.Td>
              </Table.Tr>
            )}
            {!loading && spaces.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7}>Todavía no hay espacios públicos cargados.</Table.Td>
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
                <Table.Td>
                  {space.address}
                  {(space.latitude == null || space.longitude == null) && (
                    <Badge color="orange" variant="light" size="sm" ml="xs">Sin ubicación</Badge>
                  )}
                </Table.Td>
                <Table.Td>{space.zone || '-'}</Table.Td>
                <Table.Td>{space.capacity}</Table.Td>
                <Table.Td>
                  <Badge color={space.status === 'ENABLED' ? 'green' : 'red'} variant="light">
                    {space.status === 'ENABLED' ? 'Habilitado' : 'Deshabilitado'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {space.exposure === 'INDOOR' ? 'Interior' : space.exposure === 'OUTDOOR' ? 'Exterior' : 'Mixto'}
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
        </Table.ScrollContainer>
      </Card>
    </Container>
  );
}
