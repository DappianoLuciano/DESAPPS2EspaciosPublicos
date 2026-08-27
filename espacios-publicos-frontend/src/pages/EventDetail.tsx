import { Alert, Badge, Box, Button, Card, Container, Flex, Group, List, Loader, Modal, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendar, IconCheck, IconClock, IconMapPin, IconUsers } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommunityEvent, registerToCommunityEvent } from '../lib/api';
import type { CommunityEventCatalogItem } from '../lib/api';

export default function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [opened, { open, close }] = useDisclosure(false);
  const [event, setEvent] = useState<CommunityEventCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('No se encontró el evento solicitado.');
      setLoading(false);
      return;
    }

    getCommunityEvent(id)
      .then(setEvent)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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

  const canRegister = event.requiresRegistration && event.availableCapacity > 0 && event.status === 'ACTIVE';

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
            <Box
              h={350}
              style={{
                borderRadius: 16,
                background: `url(${event.imageUrl || 'https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?auto=format&fit=crop&q=80'}) center/cover`,
                position: 'relative',
              }}
            >
              <Badge color="green" variant="filled" size="lg" radius="xl" m="md" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
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
                <List.Item>Se solicitará QR al ingreso</List.Item>
              </List>

              <Button fullWidth size="lg" mt="xl" color="blue" onClick={open} disabled={!canRegister}>
                {canRegister ? 'Reservar Lugar' : 'Sin cupos disponibles'}
              </Button>
            </Card>
          </Box>

          <Box style={{ gridColumn: 'span 8' }}>
            <Title order={1} fz={36}>{event.title}</Title>
            <Text fz="lg" c="dimmed" mt="md" maw={600}>
              {event.description}
            </Text>

            <Flex gap="md" mt="xl" direction={{ base: 'column', sm: 'row' }}>
              <Card withBorder radius="md" p="md" bg="gray.0" style={{ flex: 1 }}>
                <Group>
                  <ThemeIcon color="gray" variant="light" size="lg" radius="md"><IconCalendar size="1.2rem" /></ThemeIcon>
                  <div>
                    <Text fz="xs" c="dimmed" fw={600} tt="uppercase">Fecha</Text>
                    <Text fw={700}>{formatDate(event.startDate)}</Text>
                  </div>
                </Group>
              </Card>
              <Card withBorder radius="md" p="md" bg="gray.0" style={{ flex: 1 }}>
                <Group>
                  <ThemeIcon color="gray" variant="light" size="lg" radius="md"><IconClock size="1.2rem" /></ThemeIcon>
                  <div>
                    <Text fz="xs" c="dimmed" fw={600} tt="uppercase">Horario</Text>
                    <Text fw={700}>{formatTime(event.startDate)} - {formatTime(event.endDate)}</Text>
                  </div>
                </Group>
              </Card>
              <Card withBorder radius="md" p="md" bg="gray.0" style={{ flex: 1 }}>
                <Group>
                  <ThemeIcon color="gray" variant="light" size="lg" radius="md"><IconUsers size="1.2rem" /></ThemeIcon>
                  <div>
                    <Text fz="xs" c="dimmed" fw={600} tt="uppercase">Cupos</Text>
                    <Text fw={700}>{event.availableCapacity} de {event.capacity}</Text>
                  </div>
                </Group>
              </Card>
            </Flex>

            <Title order={3} mt={40} mb="md">Acerca del Evento</Title>
            <Text c="dimmed" lh={1.6}>
              {event.description}
            </Text>

            <Card withBorder bg="gray.0" mt={40} p="xl" radius="md">
              <Title order={4} mb="md">Requisitos e Información</Title>
              <List spacing="md" icon={<ThemeIcon color="green" size={24} radius="xl"><IconCheck size="1rem" /></ThemeIcon>}>
                <List.Item>Llevar DNI o documento de identidad</List.Item>
                <List.Item>Presentar QR de reserva en el acceso</List.Item>
                <List.Item>Reserva registrada con el correo de tu perfil</List.Item>
              </List>
            </Card>

            <Title order={3} mt={40} mb="md">Ubicación</Title>
            <Card withBorder radius="md" p={0} h={300} style={{ overflow: 'hidden', position: 'relative' }}>
              <iframe
                title="Mapa de Ubicación"
                width="100%"
                height="100%"
                style={{ border: 0, position: 'absolute', top: 0, left: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(event.publicSpace.name + ', ' + event.publicSpace.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              />
              <Card shadow="sm" p="sm" radius="md" style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1 }}>
                <Group gap="xs">
                  <IconMapPin size="1rem" color="gray" />
                  <Box>
                    <Text fw={700} fz="sm">{event.publicSpace.name}</Text>
                    <Text c="dimmed" fz="xs">{event.publicSpace.address}</Text>
                  </Box>
                </Group>
              </Card>
            </Card>
          </Box>
        </SimpleGrid>
      </Container>
    </>
  );
}
