import { ActionIcon, Alert, Box, Button, Card, Container, Flex, Select, Text, Textarea, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconArmchair, IconArrowLeft } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cancelCommunityEventRegistration, listMyCommunityEventRegistrations } from '../lib/api';
import type { CitizenCommunityEventRegistration } from '../lib/api';

export default function CancelReservation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { id } = useParams();
  const [reservation, setReservation] = useState<CitizenCommunityEventRegistration | null>(
    location.state?.reservation || null
  );
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (reservation || !id || !user?.email) {
      return;
    }

    listMyCommunityEventRegistrations()
      .then((items) => {
        setReservation(items.find((item) => item.id === id) || null);
      })
      .catch((err: Error) => setError(err.message));
  }, [id, reservation, user?.email]);

  const handleCancel = async () => {
    if (!id || !user?.email || !reason) {
      setError('Seleccioná un motivo para confirmar la cancelación.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await cancelCommunityEventRegistration(id);
      navigate('/reservations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <Container size="sm" py={40}>
      <Card withBorder shadow="sm" radius="md" p={0}>
        <Box p="xl" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <Flex align="center" gap="md">
            <ActionIcon variant="subtle" color="gray" onClick={() => navigate(-1)}>
              <IconArrowLeft size="1.2rem" />
            </ActionIcon>
            <Title order={2} fz={24}>Cancelar Reserva</Title>
          </Flex>
        </Box>

        <Box p="xl">
          {error && (
            <Alert color="red" mb="xl">
              {error}
            </Alert>
          )}

          <Card withBorder bg="gray.0" radius="md" p="md" mb="xl">
            <Flex gap="md" align="center">
              <ThemeIcon size="xl" color="gray" variant="light" radius="md">
                <IconArmchair size="1.5rem" />
              </ThemeIcon>
              <Box>
                <Text fw={700} tt="uppercase" fz="sm">{reservation?.communityEvent.title || 'Reserva seleccionada'}</Text>
                <Text size="sm" c="dimmed">{formatDate(reservation?.communityEvent.startDate)}</Text>
                <Text size="sm" c="dimmed">{reservation?.communityEvent.publicSpace.name || '-'}</Text>
              </Box>
            </Flex>
          </Card>

          <Alert 
            icon={<IconAlertTriangle size="1.2rem" />} 
            title="Liberación de cupo" 
            color="red" 
            variant="light" 
            mb="xl"
            styles={{ title: { fontWeight: 700 } }}
          >
            Al confirmar la cancelación, tu lugar será liberado inmediatamente para que otros ciudadanos puedan asistir. Esta acción no se puede deshacer.
          </Alert>

          <Select
            label="Motivo de cancelación"
            placeholder="Seleccioná un motivo..."
            data={['Problemas personales', 'Enfermedad', 'Tope de horario', 'Otro']}
            required
            mb="xl"
            withAsterisk
            value={reason}
            onChange={setReason}
          />

          <Textarea
            label="Comentarios adicionales (opcional)"
            placeholder="Contanos más detalles si lo deseás..."
            minRows={4}
            mb="xl"
          />
        </Box>

        <Box p="xl" bg="gray.0" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Flex justify="flex-end" gap="md">
            <Button variant="default" onClick={() => navigate(-1)}>
              Mantener Reserva
            </Button>
            <Button color="red" onClick={handleCancel} loading={submitting}>
              Confirmar Cancelación
            </Button>
          </Flex>
        </Box>
      </Card>
    </Container>
  );
}
