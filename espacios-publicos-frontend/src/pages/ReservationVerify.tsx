import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Title, Text, Badge, Loader, Center, Group, Button, Stack, ThemeIcon } from '@mantine/core';
import { IconCheck, IconX, IconCalendar, IconUser, IconMapPin } from '@tabler/icons-react';
import { getReservationById, listPublicSpaces } from '../lib/api';
import type { Reservation, PublicSpace } from '../lib/api';

export default function ReservationVerify() {
  const { id } = useParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [publicSpace, setPublicSpace] = useState<PublicSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await getReservationById(id);
        setReservation(res);
        
        // Fetch public spaces to find the name
        const spaces = await listPublicSpaces();
        const space = spaces.find(s => s.id === res.publicSpaceId);
        if (space) {
          setPublicSpace(space);
        }
      } catch (err: any) {
        setError(err.message || 'Error al obtener la reserva.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <Container size="sm" mt="xl">
        <Center style={{ height: '50vh' }}>
          <Stack align="center">
            <Loader size="lg" />
            <Text>Verificando reserva...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error || !reservation) {
    return (
      <Container size="sm" mt="xl">
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Center>
            <Stack align="center" gap="md">
              <ThemeIcon color="red" size="xl" radius="xl">
                <IconX size={24} />
              </ThemeIcon>
              <Title order={3}>Error de Validación</Title>
              <Text c="dimmed">{error || 'No se encontró la reserva.'}</Text>
              <Button component={Link} to="/" variant="light" mt="md">
                Volver al inicio
              </Button>
            </Stack>
          </Center>
        </Card>
      </Container>
    );
  }

  const isConfirmed = reservation.status === 'CONFIRMED';
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  };

  return (
    <Container size="sm" mt="xl">
      <Card shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="xl">
          <Center>
            <Stack align="center" gap="xs">
              <ThemeIcon 
                color={isConfirmed ? 'green' : 'red'} 
                size={64} 
                radius="xl"
              >
                {isConfirmed ? <IconCheck size={32} /> : <IconX size={32} />}
              </ThemeIcon>
              <Title order={2} mt="md">
                {isConfirmed ? 'Reserva Válida' : 'Reserva No Válida'}
              </Title>
              <Badge 
                size="lg" 
                color={isConfirmed ? 'green' : 'red'}
                variant="light"
              >
                {reservation.status}
              </Badge>
            </Stack>
          </Center>

          <Card withBorder shadow="none" p="md" radius="md" bg="var(--mantine-color-gray-0)">
            <Title order={4} mb="md">Detalles de la Reserva</Title>
            
            <Stack gap="sm">
              <Group wrap="nowrap">
                <ThemeIcon color="blue" variant="light">
                  <IconMapPin size={16} />
                </ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Espacio Público</Text>
                  <Text fw={500}>{publicSpace ? publicSpace.name : reservation.publicSpaceId}</Text>
                </div>
              </Group>

              <Group wrap="nowrap">
                <ThemeIcon color="blue" variant="light">
                  <IconCalendar size={16} />
                </ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Fecha y Hora</Text>
                  <Text fw={500}>
                    Desde: {formatDate(reservation.startDate)}
                  </Text>
                  <Text fw={500}>
                    Hasta: {formatDate(reservation.endDate)}
                  </Text>
                </div>
              </Group>

              <Group wrap="nowrap">
                <ThemeIcon color="blue" variant="light">
                  <IconUser size={16} />
                </ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Solicitante</Text>
                  <Text fw={500}>{reservation.requesterName}</Text>
                  <Text size="xs" c="dimmed">{reservation.requesterEmail}</Text>
                </div>
              </Group>
              
              <Group wrap="nowrap">
                <ThemeIcon color="blue" variant="light">
                  <IconUser size={16} />
                </ThemeIcon>
                <div>
                  <Text size="sm" c="dimmed">Asistentes Estimados</Text>
                  <Text fw={500}>{reservation.estimatedAttendees}</Text>
                </div>
              </Group>
            </Stack>
          </Card>

          <Center>
            <Button component={Link} to="/" variant="light">
              Volver al inicio
            </Button>
          </Center>
        </Stack>
      </Card>
    </Container>
  );
}
