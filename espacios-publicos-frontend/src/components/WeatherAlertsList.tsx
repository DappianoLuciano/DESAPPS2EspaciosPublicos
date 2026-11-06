import { Alert, Badge, Box, Button, Card, Group, Progress, Select, Stack, Tabs, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCloudStorm, IconCode, IconSnowflake, IconSun, IconWind } from '@tabler/icons-react';
import { useEffect, useId, useState } from 'react';
import type { WeatherAlert, WeatherAlertStatus, WeatherPhenomenon } from '../lib/api';
import { filterWeatherAlertList, weatherMeasurement, weatherStatusLabels } from '../lib/weatherAlertList';
import type { WeatherCriticalityFilter, WeatherStatusFilter } from '../lib/weatherAlertList';
import { formatStartsIn, formatWeatherDate, getWeatherWindow, weatherCriticalityColors, weatherCriticalityLabels, weatherPhenomenonLabels } from '../lib/weatherAlertPresentation';
import WeatherMeasuresButton from './WeatherMeasuresButton';
import styles from './WeatherAlertsList.module.css';

const stateLabels: Record<WeatherAlertStatus, string> = { PENDING: 'Pendiente de validación', CONFIRMED: 'Confirmada', FINALIZED: 'Finalizada', DISMISSED: 'Descartada' };
const stateColors: Record<WeatherAlertStatus, string> = { PENDING: 'yellow', CONFIRMED: 'blue', FINALIZED: 'gray', DISMISSED: 'gray' };

function WeatherIcon({ phenomenon }: { phenomenon: WeatherPhenomenon }) {
  if (phenomenon === 'VIENTO_FUERTE' || phenomenon === 'HURACAN') return <IconWind size={26} />;
  if (phenomenon === 'OLA_DE_CALOR') return <IconSun size={26} />;
  if (['OLA_DE_FRIO', 'NIEVE', 'GRANIZO'].includes(phenomenon)) return <IconSnowflake size={26} />;
  return <IconCloudStorm size={26} />;
}

function Measurement({ label, children }: { label: string; children: React.ReactNode }) {
  return <Box className={styles.measurement}><Text size="xs" c="dimmed" fw={600} tt="uppercase" mb={4}>{label}</Text><Text size="sm" fw={600}>{children}</Text></Box>;
}

type Props = {
  alerts: WeatherAlert[]; loading: boolean; busy?: boolean;
  onMessage: (alert: WeatherAlert) => void; onConfirm: (alert: WeatherAlert) => void;
  onDismiss: (alert: WeatherAlert) => void; onUpdated: () => void;
};

function AlertRow({ alert, now, busy, onMessage, onConfirm, onDismiss, onUpdated }: Omit<Props, 'alerts' | 'loading'> & { alert: WeatherAlert; now: number }) {
  const headingId = useId();
  const closed = alert.status === 'FINALIZED' || alert.status === 'DISMISSED';
  const level = alert.confirmedCriticality || alert.suggestedCriticality;
  const color = closed ? 'gray' : weatherCriticalityColors[level];
  const period = getWeatherWindow(alert, now);
  const temporalLabel = period.phase === 'active' ? 'Vigente ahora' : period.phase === 'upcoming' ? 'Próxima' : period.phase === 'expired' ? 'Vigencia vencida · revisar' : 'Fechas por revisar';
  const neighborhoods = alert.evidence.neighborhoods || [];
  const temp = [alert.evidence.temperatureMinC, alert.evidence.temperatureMaxC];
  const temperatures = temp.every(value => typeof value === 'number' && Number.isFinite(value))
    ? `${weatherMeasurement(temp[0], '°C')} / ${weatherMeasurement(temp[1], '°C')}`
    : typeof temp[0] === 'number' ? `Mín. ${weatherMeasurement(temp[0], '°C')}`
      : typeof temp[1] === 'number' ? `Máx. ${weatherMeasurement(temp[1], '°C')}` : 'Sin dato';
  return (
    <Card component="li" withBorder className={`${styles.row} ${closed ? styles.closed : alert.status === 'PENDING' ? styles.pending : styles.confirmed}`} aria-labelledby={headingId}>
      <div className={styles.grid}>
        <Stack gap="sm">
          <Group wrap="nowrap" align="flex-start" gap="sm">
            <ThemeIcon color={color} size={44} radius="md" variant="light" style={{ flexShrink: 0 }}><WeatherIcon phenomenon={alert.phenomenon} /></ThemeIcon>
            <Box style={{ minWidth: 0 }}>
              <Title order={3} id={headingId} fz={19} lh={1.3} className={alert.status === 'DISMISSED' ? styles.discardedTitle : undefined}>{weatherPhenomenonLabels[alert.phenomenon]}</Title>
              <Text size="xs" mt={4} title={neighborhoods.join(', ')}>{neighborhoods.length ? neighborhoods.slice(0, 2).join(' · ') + (neighborhoods.length > 2 ? ` (+${neighborhoods.length - 2})` : '') : alert.zone || 'Zona sin detalle'}</Text>
              <Text size="xs" c="dimmed" mt={2}>{alert.evidence.locations?.length || 1} ubicaciones de referencia</Text>
            </Box>
          </Group>
          <Group gap={6}>
            <Badge className={styles.statusBadge} radius="sm" variant="light" color={color} title="Criticidad registrada de la alerta">Criticidad {weatherCriticalityLabels[level]}</Badge>
            <Badge className={styles.statusBadge} radius="sm" variant="light" color={stateColors[alert.status]}>{stateLabels[alert.status]}</Badge>
            {alert.status === 'CONFIRMED' && period.phase !== 'active' && <Badge className={styles.statusBadge} radius="sm" variant="light" color={period.phase === 'expired' || period.phase === 'invalid' ? 'orange' : 'blue'}>{temporalLabel}</Badge>}
          </Group>
        </Stack>
        <Box className={styles.measurements}>
          <Measurement label="Ráfaga máx.">{weatherMeasurement(alert.evidence.maxWindGustKmh, 'km/h')}</Measurement>
          <Measurement label="Precip. acumulada">{weatherMeasurement(alert.evidence.accumulatedPrecipitationMm, 'mm')}</Measurement>
          <Measurement label="Temp. mín. / máx.">{temperatures}</Measurement>
          <Measurement label="Origen">{alert.evidence.provider === 'MANUAL' ? 'Carga manual' : 'Open-Meteo'}</Measurement>
          {alert.evidence.manual?.source && <Text size="xs" c="dimmed" style={{ gridColumn: '1 / -1', overflowWrap: 'anywhere' }}>Fuente: {alert.evidence.manual.source}</Text>}
        </Box>
        <Stack gap={6}>
          <Box><Text size="xs" c="dimmed" fw={600}>INICIO</Text><Text size="sm" fw={600}>{formatWeatherDate(alert.validFrom)}</Text></Box>
          <Box><Text size="xs" c="dimmed" fw={600}>FIN PREVISTO</Text><Text size="sm" fw={600}>{formatWeatherDate(alert.validUntil)}</Text></Box>
          {alert.status === 'CONFIRMED' && period.phase !== 'invalid' && <>
            <Progress value={period.progress} size={5} color={period.phase === 'expired' ? 'orange' : 'blue'} aria-label="Porcentaje de vigencia programada transcurrida" />
            <Text size="xs" c="dimmed">{period.phase === 'upcoming' ? formatStartsIn(period.startsInMinutes) : period.phase === 'expired' ? 'Período vencido; cierre pendiente' : `${period.progress}% de vigencia transcurrida`}</Text>
          </>}
          {alert.status === 'FINALIZED' && alert.finalizedAt && <Text size="xs" c="dimmed">Cierre registrado: {formatWeatherDate(alert.finalizedAt)}</Text>}
          {alert.status === 'DISMISSED' && <Text size="xs" c="dimmed" style={{ overflowWrap: 'anywhere' }}>Motivo: {alert.dismissalReason || 'Sin motivo registrado'}</Text>}
        </Stack>
        <div className={styles.actions}>
          <Button size="xs" variant="default" leftSection={<IconCode size={15} />} onClick={() => onMessage(alert)}>{alert.status === 'DISMISSED' ? 'Consultar información y motivo' : 'Ver mensaje'}</Button>
          {alert.status === 'PENDING' && <>
            <Button size="xs" variant="outline" color="red" disabled={busy} onClick={() => onDismiss(alert)}>Descartar</Button>
            <Button size="xs" color="teal" disabled={busy} onClick={() => onConfirm(alert)}>Confirmar alerta</Button>
          </>}
          {alert.status === 'CONFIRMED' && <WeatherMeasuresButton alert={alert} finish onUpdated={onUpdated} />}
          {(alert.status === 'CONFIRMED' || alert.status === 'FINALIZED') && <WeatherMeasuresButton alert={alert} onUpdated={onUpdated} />}
        </div>
      </div>
    </Card>
  );
}

export default function WeatherAlertsList({ alerts, loading, ...actions }: Props) {
  const criticalityId = useId();
  const [status, setStatus] = useState<WeatherStatusFilter>('ALL');
  const [criticality, setCriticality] = useState<WeatherCriticalityFilter>('ALL');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(interval); }, []);
  const { items, counts } = filterWeatherAlertList(alerts, status, criticality);
  return <Box className={styles.root}>
    <div className={styles.filters}>
      <Tabs value={status} onChange={value => setStatus((value || 'ALL') as WeatherStatusFilter)} variant="pills" className={styles.tabs}>
        <Tabs.List className={styles.tabsList} aria-label="Filtrar alertas por estado administrativo">
          {(Object.keys(weatherStatusLabels) as WeatherStatusFilter[]).map(value => <Tabs.Tab className={styles.tab} value={value} key={value}
            rightSection={<Badge size="sm" color={value === 'ALL' ? 'gray' : stateColors[value]} variant="light" circle>{counts[value]}</Badge>}>
            {weatherStatusLabels[value]}
          </Tabs.Tab>)}
        </Tabs.List>
      </Tabs>
      <div className={styles.criticalityFilter}>
        <Text component="label" htmlFor={criticalityId} size="sm" fw={600}>Criticidad</Text>
        <Select id={criticalityId} className={styles.select} value={criticality} onChange={value => setCriticality((value || 'ALL') as WeatherCriticalityFilter)} allowDeselect={false}
          data={[{ value: 'ALL', label: 'Todas' }, ...Object.entries(weatherCriticalityLabels).map(([value, label]) => ({ value, label }))]} />
      </div>
    </div>
    <Group justify="space-between" mb="sm"><Text size="xs" c="dimmed" role="status">{loading ? 'Actualizando alertas…' : `${items.length} de ${alerts.length} alertas · Horarios de Buenos Aires`}</Text>
      {(status !== 'ALL' || criticality !== 'ALL') && <Button size="compact-xs" variant="subtle" color="gray" onClick={() => { setStatus('ALL'); setCriticality('ALL'); }}>Limpiar filtros</Button>}
    </Group>
    <div className={`${styles.grid} ${styles.columns}`} aria-hidden="true"><span>Alerta y estado</span><span>Evidencia meteorológica</span><span>Inicio y fin · Buenos Aires</span><span>Acciones</span></div>
    {loading && !alerts.length && <Card withBorder p="lg"><Text size="sm">Cargando alertas climáticas…</Text></Card>}
    {!loading && !items.length && <Alert color="gray" title={alerts.length ? 'Sin resultados para estos filtros' : 'Todavía no se detectaron alertas climáticas'}>
      {alerts.length ? 'Probá otra combinación de estado y criticidad, o limpiá los filtros.' : 'Podés consultar el clima o crear una alerta manual.'}
    </Alert>}
    <Stack component="ul" className={styles.list} gap="md" aria-label="Listado de alertas climáticas">
      {items.map(alert => <AlertRow key={alert.id} alert={alert} now={now} {...actions} />)}
    </Stack>
  </Box>;
}
