import { Alert, Badge, Box, Button, Card, Flex, Loader, SimpleGrid, Text, Title, Container } from '@mantine/core';
import { IconCalendarEvent, IconCheck, IconHistory, IconMapPin, IconPlayerPlay } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listMyCommunityEventRegistrations } from '../lib/api';
import type { CitizenCommunityEventRegistration } from '../lib/api';

export default function MyReservations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reservations, setReservations] = useState<CitizenCommunityEventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    listMyCommunityEventRegistrations()
      .then(setReservations)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user?.email]);

  const getStatus = (reservation: CitizenCommunityEventRegistration) => {
    const now = new Date();
    const startDate = new Date(reservation.communityEvent.startDate);
    const endDate = new Date(reservation.communityEvent.endDate);

    if (endDate < now) {
      return { label: 'Pasada', color: 'gray', icon: IconHistory, opacity: 0.65 };
    }

    if (startDate <= now && endDate >= now) {
      return { label: 'En Curso', color: 'blue', icon: IconPlayerPlay, opacity: 1 };
    }

    return { label: 'Confirmada', color: 'teal', icon: IconCheck, opacity: 1 };
  };

  const formatDate = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    return `${new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(startDate)} - ${new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(endDate)}`;
  };

  return (
    <Container size="xl" py={40}>
      <Flex justify="space-between" align="center" mb={40}>
        <Box>
          <Title order={1} fz={32} mb="xs">
            Mis Reservas e Inscripciones
          </Title>
          <Text c="dimmed">
            Gestiona tus próximos eventos y actividades municipales.
          </Text>
        </Box>
        <Flex gap="md">
          <Button variant="default" radius="xl">Filtrar por Fecha</Button>
          <Button color="dark" radius="xl" onClick={() => navigate('/')}>Nueva Reserva</Button>
        </Flex>
      </Flex>

      {error && (
        <Alert color="red" mb="lg">
          {error}
        </Alert>
      )}

      {loading && (
        <Flex justify="center" py={60}>
          <Loader />
        </Flex>
      )}

      {!loading && reservations.length === 0 && (
        <Text c="dimmed">Todavía no tenés reservas activas.</Text>
      )}

      <SimpleGrid cols={3} spacing="lg">
        {reservations.map((reservation) => {
          const status = getStatus(reservation);
          const StatusIcon = status.icon;
          const event = reservation.communityEvent;
          const canCancel = status.label !== 'Pasada';

          return (
            <Card key={reservation.id} shadow="sm" padding="lg" radius="md" withBorder style={{ opacity: status.opacity }}>
              <Card.Section style={{ position: 'relative' }}>
                <Box
                  h={180}
                  style={{
                    backgroundImage: `url(${event.imageUrl || 'https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?auto=format&fit=crop&q=80'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <Badge 
                  color={status.color} 
                  variant="filled" 
                  size="lg" 
                  radius="xl"
                  style={{ position: 'absolute', top: 12, right: 12, textTransform: 'none' }}
                  leftSection={<StatusIcon size="1rem" />}
                >
                  {status.label}
                </Badge>
              </Card.Section>

              <Flex align="center" gap="xs" mt="md" mb="xs" c="dimmed">
                <IconCalendarEvent size="1.2rem" />
                <Text size="sm" fw={500}>{formatDate(event.startDate, event.endDate)}</Text>
              </Flex>

              <Title order={3} fz={20} mb="sm" lineClamp={2} style={{ minHeight: 56 }}>
                {event.title}
              </Title>

              <Flex align="flex-start" gap="xs" c="dimmed" mb="xl">
                <IconMapPin size="1.2rem" style={{ flexShrink: 0 }} />
                <Text size="sm" lineClamp={2}>{event.publicSpace.name}, {event.publicSpace.zone}</Text>
              </Flex>

              <Flex gap="sm" mt="auto">
                <Button 
                  color="blue" 
                  style={{ flex: 1 }}
                  radius="md"
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  Ver Detalle
                </Button>
                {canCancel && (
                  <Button 
                    color="red" 
                    radius="md" 
                    style={{ flex: 1 }}
                    onClick={() => navigate(`/cancel-reservation/${reservation.id}`, { state: { reservation } })}
                  >
                    Cancelar
                  </Button>
                )}
              </Flex>
            </Card>
          );
        })}
      </SimpleGrid>
    </Container>
  );
}
