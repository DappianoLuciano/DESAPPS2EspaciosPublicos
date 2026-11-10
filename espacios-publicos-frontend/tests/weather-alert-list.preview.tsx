// QA visual aislada. Todos los datos y acciones son locales: no hay solicitudes al backend ni a EDA.
import '@mantine/core/styles.css';
import { Box, Container, MantineProvider, Modal, Text, Title, Code } from '@mantine/core';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import WeatherAlertsList from '../src/components/WeatherAlertsList';
import type { WeatherAlert } from '../src/lib/api';

const date = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
const first: WeatherAlert = { id: 'ejemplo-pendiente', zone: 'CABA', latitude: -34.58, longitude: -58.42,
  phenomenon: 'TORMENTA_ELECTRICA', suggestedCriticality: 'ALTA', status: 'PENDING',
  validFrom: date(-1), validUntil: date(5), detectedAt: date(-2), evidence: {
    provider: 'OPEN_METEO', forecastFrom: date(-1), forecastTo: date(5), weatherCodes: [95], evaluatedHours: 6,
    neighborhoods: ['PALERMO', 'RECOLETA'], locations: [{ latitude: -34.58, longitude: -58.42 }, { latitude: -34.59, longitude: -58.39 }],
    maxWindGustKmh: 62, accumulatedPrecipitationMm: 38.5, temperatureMinC: 19.5, temperatureMaxC: 26,
  } };
const items: WeatherAlert[] = [first,
  { ...first, id: 'ejemplo-vigente', phenomenon: 'VIENTO_FUERTE', status: 'CONFIRMED', confirmedCriticality: 'MEDIA',
    evidence: { ...first.evidence, maxWindGustKmh: 54.4, accumulatedPrecipitationMm: 1.4, temperatureMinC: 12.4, temperatureMaxC: 21.3 } },
  { ...first, id: 'ejemplo-proxima', phenomenon: 'LLUVIA_INTENSA', status: 'CONFIRMED', confirmedCriticality: 'BAJA', validFrom: date(12), validUntil: date(18) },
  { ...first, id: 'ejemplo-finalizada', status: 'FINALIZED', finalizedAt: date(-1), validFrom: date(-12), validUntil: date(-2) },
  { ...first, id: 'ejemplo-descartada', status: 'DISMISSED', dismissalReason: 'Falso positivo contrastado con la fuente oficial.' }
];
// Bloqueo explícito: incluso la revisión de medidas de esta fixture nunca sale a servicios reales.
window.fetch = async () => new Response(JSON.stringify({ message: 'Vista de prueba: no se consultan medidas reales.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
export function Preview() {
  const [message, setMessage] = useState<string | null>(null);
  return <MantineProvider><Box bg="#F8F9F7" mih="100vh" py="xl"><Container size="xl">
    <Title order={1} fz={30} mb="xs">Alertas climáticas</Title>
    <Text size="sm" c="dimmed" mb="xl">Prueba visual local con datos de ejemplo. No publica ni modifica alertas reales.</Text>
    <WeatherAlertsList alerts={items} loading={false} onMessage={alert => setMessage(JSON.stringify(alert, null, 2))}
      onConfirm={() => setMessage('Se conserva el modal real de confirmación en la pantalla de la aplicación.')}
      onDismiss={() => setMessage('Se conserva el modal real de descarte en la pantalla de la aplicación.')} onUpdated={() => {}} />
    <Modal opened={message !== null} onClose={() => setMessage(null)} title="Vista de prueba" size="lg"><Code block>{message}</Code></Modal>
  </Container></Box></MantineProvider>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
