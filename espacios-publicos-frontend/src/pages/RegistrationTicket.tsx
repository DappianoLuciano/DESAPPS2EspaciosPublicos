import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Title, Text, Badge, Loader, Center, Group, Button, Stack, ThemeIcon, Image } from '@mantine/core';
import { IconCheck, IconX, IconCalendar, IconUser, IconMapPin } from '@tabler/icons-react';
import QRCode from 'qrcode';
import { getCommunityEventRegistration } from '../lib/api';
import type { CitizenCommunityEventRegistration } from '../lib/api';

export default function RegistrationTicket() {
  const { id } = useParams<{ id: string }>();
  const [registration, setRegistration] = useState<CitizenCommunityEventRegistration | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // El QR apunta a esta misma pagina, igual que el que se manda por mail.
    const ticketUrl = `${window.location.origin}/reservations/ticket/${id}`;

    Promise.all([getCommunityEventRegistration(id), QRCode.toDataURL(ticketUrl, { width: 240, margin: 1 })])
      .then(([res, qr]) => {
        setRegistration(res);
        setQrCode(qr);
      })
      .catch((err: Error) => setError(err.message || 'Error al obtener la inscripción.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Container size="sm" mt="xl">
        <Center style={{ height: '50vh' }}>
          <Stack align="center">
            <Loader size="lg" />
            <Text>Cargando reserva...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error || !registration) {
    return (
      <Container size="sm" mt="xl">
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Center>
            <Stack align="center" gap="md">
              <ThemeIcon color="red" size="xl" radius="xl">
                <IconX size={24} />
              </ThemeIcon>
              <Title order={3}>Reserva no encontrada</Title>
              <Text c="dimmed">{error || 'No se encontró la inscripción.'}</Text>
              <Button component={Link} to="/reservations" variant="light" mt="md">
                Volver a mis reservas
              </Button>
            </Stack>
          </Center>
        </Card>
      </Container>
    );
  }

  const event = registration.communityEvent;
  const isValid = event.status !== 'CANCELLED' && new Date(event.endDate) >= new Date();

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('es-AR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

  return (
    <Container size="sm" mt="xl" mb="xl">
      <Card shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="xl">
          <Center>
            <Stack align="center" gap="xs">
              <Title order={2} ta="center">{event.title}</Title>
              <Badge
                size="lg"
                color={isValid ? 'teal' : 'red'}
                variant="light"
                leftSection={isValid ? <IconCheck size={14} /> : <IconX size={14} />}
              >
                {isValid ? 'Inscripción válida' : 'Inscripción no válida'}
              </Badge>
            </Stack>
          </Center>

          {qrCode && (
            <Center>
              <Stack align="center" gap="xs">
                <Image src={qrCode} alt="Código QR de la inscripción" w={240} h={240} />
                <Text size="sm" c="dimmed" ta="center">
                  Presentá este código QR al momento de asistir.
                </Text>
              </Stack>
            </Center>
          )}

          <Card withBorder shadow="none" p="md" radius="md" bg="var(--mantine-color-gray-0)">
            <Title order={4} mb="md">Detalles de la Reserva</Title>

            <Stack gap="sm">
              <Group wrap="nowrap">
                <ThemeIcon color="blue" variant="light">
                  <IconMapPin size={16} />
                </ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Lugar</Text>
                  <Text fw={500}>{event.publicSpace.name}</Text>
                  <Text size="xs" c="dimmed">{event.publicSpace.address}, {event.publicSpace.zone}</Text>
                </div>
              </Group>

              <Group wrap="nowrap">
                <ThemeIcon color="blue" variant="light">
                  <IconCalendar size={16} />
                </ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Fecha y Hora</Text>
                  <Text fw={500}>Desde: {formatDate(event.startDate)}</Text>
                  <Text fw={500}>Hasta: {formatDate(event.endDate)}</Text>
                </div>
              </Group>

              <Group wrap="nowrap">
                <ThemeIcon color="blue" variant="light">
                  <IconUser size={16} />
                </ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Asistente</Text>
                  <Text fw={500}>{registration.citizenName}</Text>
                  <Text size="xs" c="dimmed">{registration.citizenEmail}</Text>
                </div>
              </Group>
            </Stack>
          </Card>

          <Group justify="center">
            <Button component={Link} to={`/event/${event.id}`} variant="light">
              Ver evento
            </Button>
            <Button component={Link} to="/reservations" variant="light">
              Mis reservas
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}
