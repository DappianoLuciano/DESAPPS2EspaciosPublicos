// Fixture local: no usa APIs, no modifica eventos ni publica en EDA.
import '@mantine/core/styles.css';
import { Box, Container, MantineProvider, SimpleGrid, Text, Title } from '@mantine/core';
import { createRoot } from 'react-dom/client';
import EventCard from '../src/components/EventCard';
import EventAvailabilityNotice from '../src/components/EventAvailabilityNotice';
import type { CommunityEventCatalogItem } from '../src/lib/api';
import exampleImage from '../src/assets/login-cultural-event.png';

const base: CommunityEventCatalogItem = {
  id: 'ejemplo', title: 'Encuentro cultural en la plaza', category: 'Cultura', tags: ['Comunidad'],
  description: 'Una actividad para compartir en el barrio.', organizerName: 'Municipio', requirements: [],
  capacity: 50, registeredCount: 20, availableCapacity: 30, requiresRegistration: true,
  startDate: '2030-11-03T19:00:00Z', endDate: '2030-11-03T21:00:00Z', status: 'ACTIVE',
  imageUrl: exampleImage, publicSpace: { id: 'plaza', name: 'Plaza del barrio', address: 'Dirección de ejemplo', zone: 'Caballito' },
};
const events: CommunityEventCatalogItem[] = [base,
  { ...base, id: 'suspendido', status: 'SUSPENDED', statusReason: 'Suspendido por alerta climática. Pendiente de revisión por la administración.' },
  { ...base, id: 'cancelado', status: 'CANCELLED', statusReason: 'Cancelado por condiciones climáticas adversas.' },
];

createRoot(document.getElementById('root')!).render(
  <MantineProvider>
    <Box bg="#F8F9F7" mih="100vh" py={32}>
      <Container size="xl">
        <Title order={1} fz={28}>Estado de las actividades</Title>
        <Text c="dimmed" mb="xl">Vista de prueba con ejemplos visuales: activo, suspendido temporalmente y cancelado definitivamente.</Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {events.map(event => <EventCard key={event.id} event={event} onClick={() => {}} />)}
        </SimpleGrid>
        <Box mt="xl"><EventAvailabilityNotice event={events[1]} /></Box>
      </Container>
    </Box>
  </MantineProvider>
);
