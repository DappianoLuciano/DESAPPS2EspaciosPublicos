import { Alert, Box, Button, Card, Container, Flex, Loader, SimpleGrid, Text, TextInput, Title } from '@mantine/core';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAdminProfile, updateAdminProfile } from '../lib/api';
import type { AdminProfile, UpdateAdminProfilePayload } from '../lib/api';

const emptyAdminForm: UpdateAdminProfilePayload = {
  name: '',
  email: '',
  phone: '',
  department: '',
};

function toAdminForm(profile: AdminProfile): UpdateAdminProfilePayload {
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone || '',
    department: profile.department || '',
  };
}

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === 'municipal_admin';
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [form, setForm] = useState<UpdateAdminProfilePayload>(emptyAdminForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    getAdminProfile()
      .then((profile) => {
        setAdminProfile(profile);
        setForm(toAdminForm(profile));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleDiscard = () => {
    if (adminProfile) {
      setForm(toAdminForm(adminProfile));
    }
    setError(null);
    setSuccess(null);
    setEditing(false);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const updatedProfile = await updateAdminProfile(form);
      setAdminProfile(updatedProfile);
      setForm(toAdminForm(updatedProfile));
      updateUser({ name: updatedProfile.name, email: updatedProfile.email });
      setSuccess('Los datos administrativos se actualizaron correctamente.');
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="lg" py={40}>
      <Title order={1} fz={32} mb="xs">Perfil y ajustes</Title>
      <Text c="dimmed" fz="md" mb={32}>
        {isAdmin ? 'Información del perfil de gestión municipal.' : 'Información asociada a tu sesión ciudadana.'}
      </Text>

      {error && <Alert color="red" mb="lg">{error}</Alert>}
      {success && <Alert color="green" icon={<IconCheck size="1rem" />} mb="lg">{success}</Alert>}

      {loading && (
        <Flex justify="center" py={60}><Loader /></Flex>
      )}

      {!loading && isAdmin && (
        <Card withBorder shadow="sm" radius="md" p="xl">
          <Flex justify="space-between" align="center" mb="xl" pb="md" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <Box>
              <Title order={2} fz={20}>Datos administrativos</Title>
              <Text size="sm" c="dimmed">Usuario de acceso: {adminProfile?.username || 'admin'}</Text>
            </Box>
            {!editing && (
              <Button variant="subtle" size="sm" leftSection={<IconEdit size="1rem" />} onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
          </Flex>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <TextInput
              label="Nombre visible"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
              readOnly={!editing}
              variant={editing ? 'default' : 'filled'}
            />
            <TextInput
              label="Correo electrónico"
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.currentTarget.value })}
              readOnly={!editing}
              variant={editing ? 'default' : 'filled'}
            />
            <TextInput
              label="Teléfono"
              value={form.phone || ''}
              onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })}
              readOnly={!editing}
              variant={editing ? 'default' : 'filled'}
            />
            <TextInput
              label="Área o dependencia"
              value={form.department || ''}
              onChange={(event) => setForm({ ...form, department: event.currentTarget.value })}
              readOnly={!editing}
              variant={editing ? 'default' : 'filled'}
            />
          </SimpleGrid>

          {editing && (
            <Flex justify="flex-end" gap="sm" mt={32} pt="lg" style={{ borderTop: '1px solid #E2E8F0' }}>
              <Button variant="default" leftSection={<IconX size="1rem" />} onClick={handleDiscard}>Descartar</Button>
              <Button leftSection={<IconCheck size="1rem" />} onClick={handleSave} loading={saving}>Guardar cambios</Button>
            </Flex>
          )}
        </Card>
      )}

      {!loading && !isAdmin && (
        <Card withBorder shadow="sm" radius="md" p="xl">
          <Title order={2} fz={20} mb="xl" pb="md" style={{ borderBottom: '1px solid #E2E8F0' }}>
            Datos de la sesión
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <TextInput label="Nombre visible" value={user?.name || ''} readOnly variant="filled" />
            <TextInput label="Identificador de acceso" value={user?.email || ''} readOnly variant="filled" />
            <TextInput label="Tipo de perfil" value="Ciudadano" readOnly variant="filled" />
          </SimpleGrid>
        </Card>
      )}
    </Container>
  );
}
