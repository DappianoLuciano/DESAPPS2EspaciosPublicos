import { Alert, Badge, Box, Button, Card, Container, Flex, Group, Image, List, Loader, Modal, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendar, IconCheck, IconClock, IconMapPin, IconUsers } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommunityEvent, listMyCommunityEventRegistrations, registerToCommunityEvent } from '../lib/api';
import type { CommunityEventCatalogItem } from '../lib/api';

export default function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [opened, { open, close }] = useDisclosure(false);
  const [event, setEvent] = useState<CommunityEventCatalogItem | null>(null);
  const [existingRegistrationId, setExistingRegistrationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('No se encontró el evento solicitado.');
      setLoading(false);
      return;
    }

    Promise.all([
      getCommunityEvent(id),
      user?.role === 'citizen' ? listMyCommunityEventRegistrations() : Promise.resolve([]),
    ])
      .then(([eventResponse, registrations]) => {
        setEvent(eventResponse);
        setExistingRegistrationId(
          registrations.find((registration) => registration.communityEventId === id)?.id || null
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, user?.role]);

  const handleConfirmReservation = async () => {
    if (!event || !user) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await registerToCommunityEvent(event.id, {
        citizenName: user.name,
        citizenEmail: user.email,
      });

      close();
      navigate('/reservation-success', { state: { event } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reservar el lugar.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
    }).format(new Date(date));
  };

  const formatTime = (date: string) => {
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <Container size="sm" py={80}>
        <Flex justify="center">
          <Loader />
        </Flex>
      </Container>
    );
  }

  if (!event) {
    return (
      <Container size="sm" py={80}>
        <Alert color="red">{error || 'No se encontró el evento solicitado.'}</Alert>
      </Container>
    );
  }

  const eventHasStarted = new Date(event.startDate) <= new Date();
  const canRegister = event.requiresRegistration && !existingRegistrationId && !eventHasStarted && event.availableCapacity > 0 && event.status === 'ACTIVE';

  const getRegistrationLabel = () => {
    if (existingRegistrationId) return 'Ver mi reserva';
    if (!event.requiresRegistration) return 'Acceso libre';
    if (eventHasStarted) return 'Inscripción cerrada';
    if (event.availableCapacity <= 0 || event.status === 'ACTIVE_FULL') return 'Sin cupos disponibles';
    return 'Reservar lugar';
  };

  const handleRegistrationAction = () => {
    if (existingRegistrationId) {
      navigate('/reservations');
      return;
    }

    if (canRegister) {
      open();
    }
  };

  return (
    <>
      <Modal opened={opened} onClose={close} title="Confirmar Reserva" centered>
        <Text size="sm" mb="md">
          Estás por reservar tu lugar para <strong>{event.title}</strong>.
        </Text>
        <Text size="sm" c="dimmed" mb="xl">
          La reserva quedará asociada a {user?.email}.
        </Text>
        <Flex justify="flex-end" gap="sm">
          <Button variant="default" onClick={close}>Cancelar</Button>
          <Button color="blue" onClick={handleConfirmReservation} loading={submitting}>
            Confirmar Reserva
          </Button>
        </Flex>
      </Modal>

      <Container size="xl" py={40}>
        {error && (
          <Alert color="red" mb="lg">
            {error}
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="xl">
          <Box style={{ gridColumn: 'span 4' }}>
            <Box h={350} style={{ borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <Image
                src={event.imageUrl || 'https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?auto=format&fit=crop&q=80'}
                fallbackSrc="https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?auto=format&fit=crop&q=80"
                alt={`Imagen de ${event.title}`}
                h="100%"
                fit="cover"
              />
              <Badge
                color="green"
                variant="filled"
                size="lg"
                radius="xl"
                style={{ position: 'absolute', top: 16, left: 16, backgroundColor: '#DCFCE7', color: '#166534' }}
              >
                ENTRADA GRATUITA
              </Badge>
            </Box>

            <Card shadow="sm" padding="xl" radius="md" withBorder mt="lg">
              <Title order={3} fz={24}>Entrada Gratuita</Title>
              <Text c="dimmed" fz="sm" mt="xs">
                {event.requiresRegistration ? 'Requiere inscripción previa' : 'Acceso libre'}
              </Text>
              
              <List spacing="sm" size="sm" mt="xl" icon={<ThemeIcon color="blue" size={20} radius="xl"><IconCheck size="0.8rem" /></ThemeIcon>}>
                <List.Item>{event.availableCapacity} cupos disponibles</List.Item>
                {event.requiresRegistration && <List.Item>Se solicitará la reserva al ingreso</List.Item>}
              </List>

              <Button
                fullWidth
                size="lg"
                mt="xl"
                color="blue"
                onClick={handleRegistrationAction}
                disabled={!canRegister && !existingRegistrationId}
              >
                {getRegistrationLabel()}
              </Button>
            </Card>
          </Box>

          <Box style={{ gridColumn: 'span 8' }}>
            <Title order={1} fz={36}>{event.title}</Title>
            <Flex gap="xs" mt="md" wrap="wrap">
              <Badge variant="light" color="blue">{event.category}</Badge>
              {event.tags.map((tag) => (
                <Badge key={tag} variant="outline" color="gray">#{tag}</Badge>
              ))}
            </Flex>
            <Text fz="lg" c="dimmed" mt="md" maw={600}>
              {event.description}
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="xl">
              <Card withBorder radius="md" p="md" bg="gray.0" mih={116}>
                <Flex align="center" gap="md" h="100%" wrap="nowrap">
                  <ThemeIcon color="gray" variant="light" size="lg" radius="md" style={{ flexShrink: 0 }}><IconCalendar size="1.2rem" /></ThemeIcon>
                  <Box style={{ minWidth: 0 }}>
                    <Text fz="xs" c="dimmed" fw={600} tt="uppercase">Fecha</Text>
                    <Text fw={700} fz="lg">{formatDate(event.startDate)}</Text>
                  </Box>
                </Flex>
              </Card>
              <Card withBorder radius="md" p="md" bg="gray.0" mih={116}>
                <Flex align="center" gap="md" h="100%" wrap="nowrap">
                  <ThemeIcon color="gray" variant="light" size="lg" radius="md" style={{ flexShrink: 0 }}><IconClock size="1.2rem" /></ThemeIcon>
                  <Box style={{ minWidth: 0 }}>
                    <Text fz="xs" c="dimmed" fw={600} tt="uppercase">Horario</Text>
                    <Text fw={700} fz="lg">{formatTime(event.startDate)} - {formatTime(event.endDate)}</Text>
                  </Box>
                </Flex>
              </Card>
              <Card withBorder radius="md" p="md" bg="gray.0" mih={116}>
                <Flex align="center" gap="md" h="100%" wrap="nowrap">
                  <ThemeIcon color="gray" variant="light" size="lg" radius="md" style={{ flexShrink: 0 }}><IconUsers size="1.2rem" /></ThemeIcon>
                  <Box style={{ minWidth: 0 }}>
                    <Text fz="xs" c="dimmed" fw={600} tt="uppercase">Cupos</Text>
                    <Text fw={700} fz="lg">{event.availableCapacity} de {event.capacity}</Text>
                  </Box>
                </Flex>
              </Card>
            </SimpleGrid>

            <Title order={3} mt={40} mb="md">Acerca del Evento</Title>
            <Text c="dimmed" lh={1.6}>
              {event.description}
            </Text>

            {event.requirements.length > 0 && (
              <Card withBorder bg="gray.0" mt={40} p="xl" radius="md">
                <Title order={4} mb="md">Requisitos e información</Title>
                <List spacing="md" icon={<ThemeIcon color="green" size={24} radius="xl"><IconCheck size="1rem" /></ThemeIcon>}>
                  {event.requirements.map((requirement) => (
                    <List.Item key={requirement}>{requirement}</List.Item>
                  ))}
                </List>
              </Card>
            )}

            <Title order={3} mt={40} mb="md">Ubicación</Title>
            <Card withBorder radius="md" p={0} h={250} style={{ overflow: 'hidden', position: 'relative' }}>
              <Box h="100%" bg="gray.2" style={{ background: 'url(https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80) center/cover' }} />
              <Card shadow="sm" p="sm" radius="md" style={{ position: 'absolute', bottom: 16, left: 16 }}>
                <Group gap="xs">
                  <IconMapPin size="1rem" color="gray" />
                  <Text fw={700} fz="sm">{event.publicSpace.name} - {event.publicSpace.zone}</Text>
                </Group>
              </Card>
            </Card>
          </Box>
        </SimpleGrid>
      </Container>
    </>
  );
}
