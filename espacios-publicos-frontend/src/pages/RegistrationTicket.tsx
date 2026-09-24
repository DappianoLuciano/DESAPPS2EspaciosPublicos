import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Card, Title, Text, Badge, Loader, Center, Group, Button, Stack, ThemeIcon, Image } from '@mantine/core';
import { IconArrowLeft, IconCheck, IconX, IconCalendar, IconUser, IconMapPin } from '@tabler/icons-react';
import QRCode from 'qrcode';
import { getCommunityEventRegistration } from '../lib/api';
import type { CitizenCommunityEventRegistration } from '../lib/api';

export default function RegistrationTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<CitizenCommunityEventRegistration | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // El QR apunta a esta misma pagina, igual que el que se manda por mail.
    const ticketUrl = `${window.location.origin}/reservations/ticket/${id}`;

    Promise.all([getCommunityEventRegistration(id), QRCode.toDataURL(ticketUrl, { width: 320, margin: 1 })])
      .then(([res, qr]) => {
        setRegistration(res);
        setQrCode(qr);
      })
      .catch((err: Error) => setError(err.message || 'Error al obtener la inscripción.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Si se entro directo (link del mail o escaneo del QR) no hay historial al que volver.
  const goBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/reservations');
    }
  };

  const backButton = (
    <Button
      variant="subtle"
      color="gray"
      size="compact-sm"
      leftSection={<IconArrowLeft size={16} />}
      onClick={goBack}
      mb="xs"
    >
      Volver
    </Button>
  );

  if (loading) {
    return (
      <Container size={420} mt="xl">
        <Center style={{ height: '40vh' }}>
          <Stack align="center">
            <Loader />
            <Text size="sm">Cargando reserva...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error || !registration) {
    return (
      <Container size={420} mt="lg">
        {backButton}
        <Card shadow="sm" p="md" radius="md" withBorder>
          <Stack align="center" gap="sm">
            <ThemeIcon color="red" size="lg" radius="xl">
              <IconX size={20} />
            </ThemeIcon>
            <Title order={4}>Reserva no encontrada</Title>
            <Text size="sm" c="dimmed" ta="center">{error || 'No se encontró la inscripción.'}</Text>
          </Stack>
        </Card>
      </Container>
    );
  }

  const event = registration.communityEvent;
  const isValid = event.status !== 'CANCELLED' && new Date(event.endDate) >= new Date();

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Container size={420} mt="lg" mb="lg">
      {backButton}
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Stack align="center" gap={6}>
            <Title order={4} ta="center">{event.title}</Title>
            <Badge
              color={isValid ? 'teal' : 'red'}
              variant="light"
              leftSection={isValid ? <IconCheck size={12} /> : <IconX size={12} />}
            >
              {isValid ? 'Inscripción válida' : 'Inscripción no válida'}
            </Badge>
          </Stack>

          {qrCode && (
            <Stack align="center" gap={4}>
              <Image src={qrCode} alt="Código QR de la inscripción" w={160} h={160} />
              <Text size="xs" c="dimmed" ta="center">
                Presentá este código QR al momento de asistir.
              </Text>
            </Stack>
          )}

          <Stack gap="xs">
            <Group wrap="nowrap" gap="xs" align="flex-start">
              <IconMapPin size={16} style={{ flexShrink: 0, marginTop: 2 }} color="var(--mantine-color-blue-6)" />
              <Text size="sm">
                {event.publicSpace.name}
                <Text span size="xs" c="dimmed"> · {event.publicSpace.address}, {event.publicSpace.zone}</Text>
              </Text>
            </Group>
            <Group wrap="nowrap" gap="xs" align="flex-start">
              <IconCalendar size={16} style={{ flexShrink: 0, marginTop: 2 }} color="var(--mantine-color-blue-6)" />
              <Text size="sm">
                {formatDate(event.startDate)} – {formatDate(event.endDate)}
              </Text>
            </Group>
            <Group wrap="nowrap" gap="xs" align="flex-start">
              <IconUser size={16} style={{ flexShrink: 0, marginTop: 2 }} color="var(--mantine-color-blue-6)" />
              <Text size="sm">
                {registration.citizenName}
                <Text span size="xs" c="dimmed"> · {registration.citizenEmail}</Text>
              </Text>
            </Group>
          </Stack>

          <Button component={Link} to={`/event/${event.id}`} variant="light" size="xs" fullWidth>
            Ver evento
          </Button>
        </Stack>
      </Card>
    </Container>
  );
}
