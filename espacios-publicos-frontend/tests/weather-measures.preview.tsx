// QA local con respuestas en memoria: ninguna solicitud sale al backend o a EDA.
import '@mantine/core/styles.css';
import { Box, Container, MantineProvider, Text, Title } from '@mantine/core';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import WeatherAlertCard from '../src/components/WeatherAlertCard';
import type { WeatherAlert, WeatherImpactPlan } from '../src/lib/api';

const now = Date.now();
const date = (hours: number) => new Date(now + hours * 3600_000).toISOString();
const alert: WeatherAlert = { id: 'ejemplo-medidas', status: 'CONFIRMED', phenomenon: 'TORMENTA_ELECTRICA',
  zone: 'CABA', latitude: -34.611, longitude: -58.383, suggestedCriticality: 'ALTA', confirmedCriticality: 'ALTA',
  detectedAt: date(-1), validFrom: date(-1), validUntil: date(5),
  evidence: { provider: 'MANUAL', neighborhoods: ['MONSERRAT'], weatherCodes: [], evaluatedHours: 0,
    forecastFrom: date(-1), forecastTo: date(5) } };
const plan: WeatherImpactPlan = { alertId: alert.id, status: 'CONFIRMED', validFrom: alert.validFrom, validUntil: alert.validUntil,
  neighborhoods: ['MONSERRAT'], canApply: true, activeSpaceCount: 0, activeEventCount: 0, appliedSpaces: [], appliedEvents: [],
  spaces: [
    { id: 's1', name: 'Plaza de ejemplo', zone: 'Monserrat', exposure: 'OUTDOOR', restricted: false, events: [
      { id: 'e1', title: 'Encuentro cultural', startDate: date(1), endDate: date(3), status: 'ACTIVE', selectable: true, restricted: false },
      { id: 'e2', title: 'Taller ya suspendido por mantenimiento', startDate: date(1), endDate: date(2), status: 'SUSPENDED', selectable: false, restricted: false }
    ] },
    { id: 's2', name: 'Patio municipal de ejemplo', zone: 'Monserrat', exposure: 'MIXED', restricted: false, events: [] }
  ] };
window.fetch = async (input, init) => {
  const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).pathname;
  if (!path.startsWith(`/api/admin/weather-alerts/${alert.id}/`)) throw new Error('Esta vista solo permite datos de prueba locales.');
  if (path.endsWith('/finalize')) { plan.status = 'FINALIZED'; plan.canApply = false; }
  else if (path.endsWith('/release')) {
    plan.activeSpaceCount = 0; plan.activeEventCount = 0; plan.appliedSpaces = []; plan.appliedEvents = [];
    plan.spaces.forEach(space => { space.restricted = false; space.events.forEach(event => { event.restricted = false; }); });
  } else if (path.endsWith('/restrictions')) {
    const body = JSON.parse(String(init?.body));
    plan.spaces.forEach(space => {
      if (body.spaceIds.includes(space.id)) space.restricted = true;
      space.events.forEach(event => { if (body.eventIds.includes(event.id)) event.restricted = true; });
    });
    plan.appliedSpaces = plan.spaces.filter(space => space.restricted).map(space => ({ id: space.id, name: space.name }));
    plan.appliedEvents = plan.spaces.flatMap(space => space.events.filter(event => event.restricted).map(event => ({ id: event.id, title: event.title })));
    plan.activeSpaceCount = plan.appliedSpaces.length; plan.activeEventCount = plan.appliedEvents.length;
  }
  return new Response(JSON.stringify(path.endsWith('/finalize') ? { alert: { ...alert, status: 'FINALIZED' }, delivery: { failed: 0 } } : plan),
    { status: 200, headers: { 'Content-Type': 'application/json' } });
};
createRoot(document.getElementById('root')!).render(<MantineProvider><MemoryRouter>
  <Box bg="#F8F9F7" mih="100vh" py="xl"><Container size="sm">
    <Title order={1} fz={26}>Medidas ante una alerta</Title>
    <Text c="dimmed" mb="xl">Prueba visual local. No modifica Supabase ni publica en EDA.</Text>
    <WeatherAlertCard alert={alert} now={now} />
  </Container></Box>
</MemoryRouter></MantineProvider>);
