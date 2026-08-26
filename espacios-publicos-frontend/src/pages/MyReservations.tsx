import { Container, Title, Text, SimpleGrid, Card, Badge, Flex, Button, Box } from '@mantine/core';
import { IconCalendarEvent, IconMapPin, IconCheck, IconPlayerPlay, IconHistory } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function MyReservations() {
  const navigate = useNavigate();

  const reservations = [
    {
      id: 1,
      title: 'Concierto Sinfónico de Otoño',
      date: '15 Oct 2023 • 19:00',
      location: 'Auditorio Municipal, Plaza Mayor',
      status: 'Confirmada',
      image: 'https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?auto=format&fit=crop&q=80',
      color: 'teal',
      icon: IconCheck,
      actionText: 'Ver Detalle',
      actionVariant: 'filled',
      actionColor: 'blue'
    },
    {
      id: 2,
      title: 'Taller de Innovación Deportiva',
      date: 'Hoy • 10:00 - 12:00',
      location: 'Polideportivo Centro, Pista 2',
      status: 'En Curso',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbb4d642e5?auto=format&fit=crop&q=80',
      color: 'blue',
      icon: IconPlayerPlay,
      actionText: 'Gestionar',
      actionVariant: 'filled',
      actionColor: 'dark'
    },
    {
      id: 3,
      title: 'Visita Guiada: Jardín Botánico',
      date: '02 Sep 2023 • 11:00',
      location: 'Parque del Retiro Sur',
      status: 'Pasada',
      image: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb65?auto=format&fit=crop&q=80',
      color: 'gray',
      icon: IconHistory,
      actionText: 'Ver Resumen',
      actionVariant: 'outline',
      actionColor: 'gray',
      opacity: 0.6
    }
  ];

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

      <SimpleGrid cols={3} spacing="lg">
        {reservations.map((res) => (
          <Card key={res.id} shadow="sm" padding="lg" radius="md" withBorder style={{ opacity: res.opacity || 1 }}>
            <Card.Section style={{ position: 'relative' }}>
              <Box h={180} style={{ backgroundImage: `url(${res.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <Badge 
                color={res.color} 
                variant="filled" 
                size="lg" 
                radius="xl"
                style={{ position: 'absolute', top: 12, right: 12, textTransform: 'none' }}
                leftSection={<res.icon size="1rem" />}
              >
                {res.status}
              </Badge>
            </Card.Section>

            <Flex align="center" gap="xs" mt="md" mb="xs" c="dimmed">
              <IconCalendarEvent size="1.2rem" />
              <Text size="sm" fw={500}>{res.date}</Text>
            </Flex>

            <Title order={3} fz={20} mb="sm" lineClamp={2} style={{ minHeight: 56 }}>
              {res.title}
            </Title>

            <Flex align="flex-start" gap="xs" c="dimmed" mb="xl">
              <IconMapPin size="1.2rem" style={{ flexShrink: 0 }} />
              <Text size="sm" lineClamp={2}>{res.location}</Text>
            </Flex>

            <Flex gap="sm" mt="auto">
              {res.id === 1 && (
                <>
                  <Button 
                    variant={res.actionVariant} 
                    color={res.actionColor} 
                    style={{ flex: 1 }}
                    radius="md"
                    onClick={() => navigate(`/event/${res.id}`)}
                  >
                    {res.actionText}
                  </Button>
                  <Button 
                    color="red" 
                    radius="md" 
                    style={{ flex: 1 }}
                    onClick={() => navigate(`/cancel-reservation/${res.id}`)}
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </Flex>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
