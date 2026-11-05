// Vista de QA accesible solo en el servidor de desarrollo. No se importa desde la app.
// Usa ejemplos visuales y no consulta el backend, Open-Meteo ni EDA.
import '@mantine/core/styles.css';
import { Box, Container, MantineProvider, SimpleGrid, Text, Title } from '@mantine/core';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import WeatherAlertCard from '../src/components/WeatherAlertCard';
import type { WeatherAlert } from '../src/lib/api';

const now = Date.now();
const date = (hours: number) => new Date(now + hours * 60 * 60_000).toISOString();
const evidence: WeatherAlert['evidence'] = {
  provider: 'MANUAL', locations: [{ latitude: -34.61, longitude: -58.38 }],
  neighborhoods: ['MONSERRAT', 'CONSTITUCION'], weatherCodes: [], evaluatedHours: 0,
  forecastFrom: date(-1), forecastTo: date(3),
  maxWindGustKmh: 82, accumulatedPrecipitationMm: 45, temperatureMinC: 17, temperatureMaxC: 24,
  manual: { createdBy: 'visual-test', createdAt: date(-1), reason: 'Ejemplo de diseño', source: 'Prueba visual local', locationIds: [] },
};
const first: WeatherAlert = {
  id: 'ejemplo-visual-vigente', zone: 'CABA', latitude: -34.61, longitude: -58.38,
  phenomenon: 'TORMENTA_ELECTRICA', suggestedCriticality: 'CRITICA', confirmedCriticality: 'CRITICA',
  status: 'CONFIRMED', validFrom: date(-1), validUntil: date(3), detectedAt: date(-1), evidence,
};
const second: WeatherAlert = {
  ...first, id: 'ejemplo-visual-proxima', phenomenon: 'LLUVIA_INTENSA',
  suggestedCriticality: 'ALTA', confirmedCriticality: 'ALTA', validFrom: date(2), validUntil: date(6),
  evidence: { ...evidence, neighborhoods: ['PALERMO'], forecastFrom: date(2), forecastTo: date(6) },
};

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={{ fontFamily: 'Arial, sans-serif' }}>
    <MemoryRouter>
      <Box mih="100vh" bg="#F8F9F7" py={32}>
        <Container size="lg">
          <Title order={1} fz={28}>Cards de alertas climáticas</Title>
          <Text c="dimmed" mb="xl">Vista de prueba local con datos de ejemplo. No publica ni modifica alertas reales.</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <WeatherAlertCard alert={first} now={now} />
            <WeatherAlertCard alert={second} now={now} />
          </SimpleGrid>
        </Container>
      </Box>
    </MemoryRouter>
  </MantineProvider>,
);
