import { Box, Container, Title, Text, SimpleGrid, Card, Badge, ActionIcon, Flex, Button } from '@mantine/core';
import { IconArrowRight, IconBookmark } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCommunityEvents } from '../lib/api';
import type { CommunityEventCatalogItem } from '../lib/api';

export default function Home() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CommunityEventCatalogItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const categories = [
    {
      id: 'musica',
      label: 'Música',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80',
    },
    {
      id: 'arte',
      label: 'Arte',
      image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80',
    },
    {
      id: 'charlas',
      label: 'Charlas',
      image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80',
    },
    {
      id: 'juegos',
      label: 'Juegos',
      image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&q=80',
    },
  ];

  useEffect(() => {
    listCommunityEvents({ availableOnly: true })
      .then((response) => setEvents(response.items))
      .catch((err: Error) => setEventsError(err.message))
      .finally(() => setLoadingEvents(false));
  }, []);

  const formatEventDate = (date: string) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <Container size="lg" py={40}>
      <Box
        h={350}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(0deg, rgba(0, 10, 36, 0.9) 0%, rgba(0, 10, 36, 0.5) 50%, rgba(0, 10, 36, 0) 100%), url(https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80) center/cover',
          position: 'relative',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <Badge color="green" variant="filled" size="lg" radius="xl" mb="md" style={{ width: 'fit-content', color: '#002116', backgroundColor: '#B2F0D3' }}>
          DESTACADO
        </Badge>
        <Title order={1} c="white" fz={40} mb="sm">
          Noche de los Museos 2026
        </Title>
        <Text c="rgba(255,255,255,0.9)" fz="lg" maw={600} mb="xl">
          Explora el arte y la cultura de la ciudad en una noche inolvidable. Cientos de museos e instituciones abren sus puertas con actividades especiales gratuitas.
        </Text>
      </Box>

      <Flex justify="space-between" align="center" mt={48} mb={24}>
        <Title order={2}>Categorías</Title>
        <Button variant="subtle" size="xs">Ver todas</Button>
      </Flex>

      <SimpleGrid cols={4} spacing="lg">
        {categories.map((cat) => (
          <Card 
            key={cat.label} 
            className="category-card"
            shadow="sm" 
            padding={0} 
            radius="md" 
            withBorder 
            h={210}
            style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
            onClick={() => navigate(`/category/${cat.id}`)}
          >
            <Box
              className="category-card-image"
              h="100%"
              style={{
                backgroundImage: `url(${cat.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <Box className="category-card-overlay" />
            <Flex
              direction="column"
              align="center"
              justify="center"
              h="100%"
              w="100%"
              p="lg"
              style={{ position: 'absolute', inset: 0 }}
            >
              <Text fw={800} fz={28} c="white" ta="center">
                {cat.label}
              </Text>
            </Flex>
            <Box
              className="category-card-cta"
              bg="#000A24"
              c="white"
              px="md"
              py={8}
              style={{
                position: 'absolute',
                left: 16,
                bottom: 16,
                borderRadius: 6,
                boxShadow: '0 8px 18px rgba(0, 0, 0, 0.16)',
              }}
            >
              <Flex align="center" gap={6}>
                <Text fw={700} fz="sm">Ver más</Text>
                <IconArrowRight size="1rem" />
              </Flex>
            </Box>
          </Card>
        ))}
      </SimpleGrid>

      <Title order={2} mt={48} mb={24}>
        Próximos Eventos
      </Title>

      {eventsError && (
        <Text c="red" mb="md">
          {eventsError}
        </Text>
      )}

      {!loadingEvents && events.length === 0 && (
        <Text c="dimmed">Todavía no hay eventos publicados.</Text>
      )}

      <SimpleGrid cols={3} spacing="lg">
        {events.map((event) => (
          <Card key={event.id} shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => navigate(`/event/${event.id}`)}>
            <Card.Section>
              <Box h={160} bg="gray.2" style={{ backgroundImage: `url(${event.imageUrl || 'https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?auto=format&fit=crop&q=80'})`, backgroundSize: 'cover' }}>
                <ActionIcon variant="default" radius="md" size="lg" style={{ position: 'absolute', top: 16, right: 16 }}>
                  <IconBookmark size="1.1rem" color="gray" />
                </ActionIcon>
              </Box>
            </Card.Section>

            <Text c="dimmed" fz="xs" fw={700} mt="md" tt="uppercase">{event.category}</Text>
            <Text fw={600} fz="xl" mt="xs">{event.title}</Text>
            <Text fz="sm" c="dimmed" mt="sm" lineClamp={2}>
              {event.description}
            </Text>

            <Badge variant="light" color="gray" mt="lg" fullWidth size="lg" radius="sm">
              {formatEventDate(event.startDate)}
            </Badge>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
