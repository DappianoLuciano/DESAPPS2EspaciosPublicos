import { Alert, Badge, Box, Card, Container, Flex, SimpleGrid, Text, TextInput, Title } from '@mantine/core';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { listCommunityEvents } from '../lib/api';
import type { CommunityEventCatalogItem } from '../lib/api';
import { FEATURED_CATEGORIES } from '../lib/eventCategories';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR');
}

export default function Home() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CommunityEventCatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    listCommunityEvents({ availableOnly: true, upcomingOnly: true })
      .then((response) => setEvents(response.items))
      .catch((err: Error) => setEventsError(err.message))
      .finally(() => setLoadingEvents(false));
  }, []);

  const filteredEvents = useMemo(() => {
    const query = normalizeSearch(search.trim());

    if (!query) {
      return events;
    }

    return events.filter((event) => normalizeSearch([
      event.title,
      event.description,
      event.category,
      ...event.tags,
      event.publicSpace.name,
      event.publicSpace.zone,
    ].join(' ')).includes(query));
  }, [events, search]);

  return (
    <Container size="xl" py={32}>
      <Box
        h={330}
        style={{
          borderRadius: 8,
          background: 'linear-gradient(0deg, rgba(0, 10, 36, 0.9) 0%, rgba(0, 10, 36, 0.45) 55%, rgba(0, 10, 36, 0.08) 100%), url(https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80) center/cover',
          position: 'relative',
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <Badge color="green" variant="filled" size="lg" radius="xl" mb="md" style={{ width: 'fit-content', color: '#002116', backgroundColor: '#B2F0D3' }}>
          DESTACADO
        </Badge>
        <Title order={1} c="white" fz={40} mb="sm">
          Agenda cultural de la ciudad
        </Title>
        <Text c="rgba(255,255,255,0.9)" fz="lg" maw={650}>
          Encontrá actividades, reservá tu lugar y descubrí espacios culturales en distintos barrios.
        </Text>
      </Box>

      <Title order={2} mt={40} mb={20}>Categorías</Title>

      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
        {FEATURED_CATEGORIES.map((category) => (
          <Card
            key={category.id}
            className="category-card"
            shadow="sm"
            padding={0}
            radius="md"
            withBorder
            h={190}
            style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
            onClick={() => navigate(`/category/${category.id}`)}
          >
            <Box
              className="category-card-image"
              h="100%"
              style={{
                backgroundImage: `url(${category.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <Box className="category-card-overlay" />
            <Flex align="center" justify="center" h="100%" w="100%" p="lg" style={{ position: 'absolute', inset: 0 }}>
              <Text fw={800} fz={28} c="white" ta="center">{category.label}</Text>
            </Flex>
            <Flex
              className="category-card-cta"
              align="center"
              gap={6}
              bg="#000A24"
              c="white"
              px="md"
              py={8}
              style={{ position: 'absolute', left: 16, bottom: 16, borderRadius: 6 }}
            >
              <Text fw={700} fz="sm">Ver eventos</Text>
              <IconArrowRight size="1rem" />
            </Flex>
          </Card>
        ))}
      </SimpleGrid>

      <Flex justify="space-between" align={{ base: 'stretch', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="md" mt={48} mb={24}>
        <Box>
          <Title order={2}>Próximos eventos</Title>
          <Text c="dimmed" size="sm">Buscá por actividad, categoría, espacio o barrio.</Text>
        </Box>
        <TextInput
          placeholder="Buscar eventos"
          aria-label="Buscar eventos"
          leftSection={<IconSearch size="1rem" />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          w={{ base: '100%', sm: 320 }}
        />
      </Flex>

      {eventsError && <Alert color="red" mb="md">{eventsError}</Alert>}

      {!loadingEvents && filteredEvents.length === 0 && (
        <Text c="dimmed">
          {search ? 'No encontramos eventos para esa búsqueda.' : 'Todavía no hay eventos publicados.'}
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} onClick={() => navigate(`/event/${event.id}`)} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
