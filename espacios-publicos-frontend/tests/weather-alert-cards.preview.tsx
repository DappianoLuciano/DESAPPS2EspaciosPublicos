// Vista de QA accesible solo en el servidor de desarrollo. No se importa desde la app.
// Usa ejemplos visuales y no consulta el backend, Open-Meteo ni EDA.
import '@mantine/core/styles.css';
import { Box, Container, MantineProvider, Stack, Text } from '@mantine/core';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import WeatherAlertCard from '../src/components/WeatherAlertCard';
import WeatherAlertOverview from '../src/components/WeatherAlertOverview';
import { summarizeWeatherAlerts } from '../src/lib/weatherAlertPresentation';
import styles from '../src/components/WeatherDashboard.module.css';
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
const summary = summarizeWeatherAlerts([first, { ...second, status: 'PENDING' },
  ...[1, 2, 3, 4].map(id => ({ ...first, id: `vencida-${id}`, validFrom: date(-6), validUntil: date(-2) }))], now);

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={{ fontFamily: 'Arial, sans-serif' }}>
    <MemoryRouter>
      <Box mih="100vh" bg="#F8F9F7" py={32}>
        <Container size="xl">
          <Text size="xs" c="dimmed" mb="md">Prueba visual con datos de ejemplo. No publica ni modifica alertas reales.</Text>
          <Box component="section" className={styles.section}>
            <WeatherAlertOverview summary={summary} pendingRelease={0} updatedAt={date(0)} hasData loading={false} stale={false} onRefresh={() => {}} />
            <Stack gap="md"><WeatherAlertCard alert={first} now={now} /></Stack>
          </Box>
        </Container>
      </Box>
    </MemoryRouter>
  </MantineProvider>,
);
