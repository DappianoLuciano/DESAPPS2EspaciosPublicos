import { ActionIcon, Alert, Box, Container, Flex, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { listCommunityEvents } from '../lib/api';
import type { CommunityEventCatalogItem } from '../lib/api';
import { getCategoryLabel } from '../lib/eventCategories';

export default function CategoryEvents() {
  const { id } = useParams();
  const navigate = useNavigate();
  const categoryName = getCategoryLabel(id);
  const [events, setEvents] = useState<CommunityEventCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCommunityEvents({ category: categoryName, availableOnly: true, upcomingOnly: true })
      .then((response) => setEvents(response.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [categoryName]);

  return (
    <Container size="xl" py={40}>
      <Flex align="center" gap="md" mb={40}>
        <ActionIcon variant="light" size="xl" radius="md" onClick={() => navigate('/')} aria-label="Volver al inicio">
          <IconArrowLeft size="1.5rem" />
        </ActionIcon>
        <Box>
          <Title order={1} fz={32}>Eventos de {categoryName}</Title>
          <Text c="dimmed">Actividades próximas clasificadas en esta categoría o etiqueta.</Text>
        </Box>
      </Flex>

      {error && <Alert color="red" mb="lg">{error}</Alert>}

      {loading && (
        <Flex justify="center" py={60}><Loader /></Flex>
      )}

      {!loading && events.length === 0 && (
        <Text c="dimmed">No hay eventos próximos en esta categoría.</Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {events.map((event) => (
          <EventCard key={event.id} event={event} onClick={() => navigate(`/event/${event.id}`)} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
