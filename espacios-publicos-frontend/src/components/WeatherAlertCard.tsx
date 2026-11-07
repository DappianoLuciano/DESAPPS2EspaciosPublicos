import { Badge, Box, Button, Card, Collapse, Flex, Group, Progress, Stack, Text, ThemeIcon, Title, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconCloudRain, IconCloudStorm, IconSnowflake, IconSun, IconWind } from '@tabler/icons-react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WeatherAlert, WeatherPhenomenon } from '../lib/api';
import { formatStartsIn, formatWeatherDate, getWeatherWindow, weatherCriticalityColors, weatherCriticalityLabels, weatherPhenomenonLabels } from '../lib/weatherAlertPresentation';
import WeatherMeasuresButton from './WeatherMeasuresButton';
import styles from './WeatherDashboard.module.css';

function PhenomenonIcon({ phenomenon }: { phenomenon: WeatherPhenomenon }) {
  switch (phenomenon) {
    case 'OLA_DE_CALOR': return <IconSun size={26} aria-hidden="true" />;
    case 'OLA_DE_FRIO':
    case 'NIEVE':
    case 'GRANIZO': return <IconSnowflake size={26} aria-hidden="true" />;
    case 'VIENTO_FUERTE':
    case 'HURACAN': return <IconWind size={26} aria-hidden="true" />;
    case 'LLUVIA_INTENSA': return <IconCloudRain size={26} aria-hidden="true" />;
    default: return <IconCloudStorm size={26} aria-hidden="true" />;
  }
}

function Measurement({ label, value, unit }: { label: string; value?: number; unit: string }) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return <Text size="sm"><Text span fw={600}>{label}:</Text> {value} {unit}</Text>;
}

export default function WeatherAlertCard({ alert, now, onUpdated }: { alert: WeatherAlert; now: number; onUpdated?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const headingId = useId();
  const level = alert.confirmedCriticality || alert.suggestedCriticality;
  const color = weatherCriticalityColors[level];
  const window = getWeatherWindow(alert, now);
  const upcoming = window.phase === 'upcoming';
  const neighborhoods = alert.evidence.neighborhoods || [];
  const locations = alert.evidence.locations?.length || 1;

  return (
    <Card component="article" aria-labelledby={headingId} className={styles.card} radius="md" shadow="xs" withBorder p={0}
      style={{ borderInlineStart: `6px solid var(--mantine-color-${color}-7)`, overflow: 'hidden', alignSelf: 'start' }}>
      <div className={styles.layout}>
        <Box className={styles.identity}>
        <Group align="center" wrap="nowrap" gap="md">
          <ThemeIcon color={color} variant="light" size={52} radius="lg" style={{ flexShrink: 0 }}>
            <PhenomenonIcon phenomenon={alert.phenomenon} />
          </ThemeIcon>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap={6} mb={6}>
              <Badge color={color} size="xs" variant="light">{weatherCriticalityLabels[level]}</Badge>
              <Badge color="gray" size="xs" variant="outline">Confirmada</Badge>
              <Badge color={upcoming ? 'gray' : color} size="xs" variant="light">{upcoming ? 'Próxima' : 'Vigente ahora'}</Badge>
              {!alert.confirmedCriticality && <Badge color="gray" size="xs" variant="outline">Nivel sugerido</Badge>}
            </Group>
            <Title id={headingId} order={3} fz={22} lh={1.25}>{weatherPhenomenonLabels[alert.phenomenon]}</Title>
          </Box>
        </Group>

        <Text size="xs" c="dimmed" mt="md" lineClamp={2} title={neighborhoods.join(', ')}>
          {neighborhoods.length ? `Barrios de referencia: ${neighborhoods.join(', ')}` : `Zona de referencia: ${alert.zone || 'Sin detalle'}`}
        </Text>
        </Box>

        <Box className={styles.timing}>
          <Flex justify="space-between" gap="md" mb="xs">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text fz={11} tt="uppercase" c="dimmed" fw={600}>Inicio</Text>
              <Text size="xs" fw={600} mt={4}>{formatWeatherDate(alert.validFrom)}</Text>
            </Box>
            <Box ta="right" style={{ flex: 1, minWidth: 0 }}>
              <Text fz={11} tt="uppercase" c="dimmed" fw={600}>Fin previsto</Text>
              <Text size="xs" fw={600} mt={4}>{formatWeatherDate(alert.validUntil)}</Text>
            </Box>
          </Flex>
          <Text size="xs" fw={700} c={`${color}.8`} mb={6} mt="md">
            {upcoming ? formatStartsIn(window.startsInMinutes) : `${window.progress}% de vigencia transcurrida`}
          </Text>
          {upcoming ? (
            <Box h={6} role="img" aria-label="La vigencia todavía no comenzó"
              style={{ borderRadius: 999, backgroundColor: 'var(--mantine-color-gray-1)',
                backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 8px, var(--mantine-color-${color}-2) 8px, var(--mantine-color-${color}-2) 16px)` }} />
          ) : <Progress color={color} value={window.progress} size={6} radius="xl" aria-label="Porcentaje de vigencia programada transcurrida" />}
        </Box>
        <div className={styles.actions}>
          <WeatherMeasuresButton alert={alert} onUpdated={onUpdated} />
          <UnstyledButton className={styles.detailsToggle} onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls={detailsId}>
        <Group justify="space-between">
          <Text size="xs" fw={500}>{expanded ? 'Ocultar detalles técnicos' : 'Ver detalles técnicos'}</Text>
          <IconChevronDown size={18} aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : undefined }} />
        </Group>
      </UnstyledButton>
        </div>
      </div>
      <Collapse expanded={expanded} id={detailsId}>
        <Stack gap="xs" className={styles.details}>
          <Text size="sm">{neighborhoods.length ? `Barrios: ${neighborhoods.join(', ')}` : 'No hay barrios calculados para los puntos de esta alerta.'}</Text>
          <Text size="xs" c="dimmed">Los barrios contienen los puntos de referencia; no representan toda la extensión del fenómeno.</Text>
          <Text size="sm">Origen: {alert.evidence.provider === 'MANUAL' ? 'Carga manual confirmada' : 'Pronóstico Open-Meteo confirmado'} · Ubicaciones: {locations}</Text>
          {alert.evidence.manual?.source && <Text size="sm">Fuente declarada: {alert.evidence.manual.source}</Text>}
          <Measurement label="Ráfaga máxima" value={alert.evidence.maxWindGustKmh} unit="km/h" />
          <Measurement label="Precipitación acumulada" value={alert.evidence.accumulatedPrecipitationMm} unit="mm" />
          <Measurement label="Temperatura mínima" value={alert.evidence.temperatureMinC} unit="°C" />
          <Measurement label="Temperatura máxima" value={alert.evidence.temperatureMaxC} unit="°C" />
          <Text size="xs" c="dimmed">La barra indica tiempo de vigencia, no probabilidad ni avance del fenómeno. Horarios de Buenos Aires.</Text>
          <Text size="xs" c="dimmed" style={{ overflowWrap: 'anywhere' }}>Alerta: {alert.id}</Text>
          <Button component={Link} to="/admin/weather-alerts" variant="light" color={color} size="sm" mt="xs">Ir a la gestión de alertas</Button>
        </Stack>
      </Collapse>
    </Card>
  );
}
