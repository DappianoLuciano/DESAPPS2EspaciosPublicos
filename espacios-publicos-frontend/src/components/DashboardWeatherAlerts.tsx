import { Alert, Box, Card, Group, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { listWeatherAlerts } from '../lib/api';
import type { WeatherAlert } from '../lib/api';
import { summarizeWeatherAlerts } from '../lib/weatherAlertPresentation';
import WeatherAlertCard from './WeatherAlertCard';
import WeatherAlertOverview from './WeatherAlertOverview';
import styles from './WeatherDashboard.module.css';

export default function DashboardWeatherAlerts() {
  const [alerts, setAlerts] = useState<WeatherAlert[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    return listWeatherAlerts(undefined, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setAlerts(result);
      setUpdatedAt(new Date().toISOString());
      setNow(Date.now());
      setError(null);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'No se pudieron consultar las alertas.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
  }, []);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  useEffect(() => {
    // Solo actualiza el reloj visual. No consulta clima, no cierra alertas y no publica a EDA.
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const summary = summarizeWeatherAlerts(alerts || [], now);
  const pendingRelease = (alerts || []).filter(alert => alert.status === 'FINALIZED' && (alert.activeRestrictionCount || 0) > 0).length;

  return (
    <Box component="section" className={styles.section} aria-labelledby="dashboard-weather-title" mb={32}>
      <WeatherAlertOverview summary={summary} pendingRelease={pendingRelease} updatedAt={updatedAt} loading={loading}
        stale={!!error} hasData={alerts !== null} onRefresh={() => { setLoading(true); void load(); }} />

      <Stack gap="md">
        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={20} />} title="No se pudieron actualizar las alertas">
            <Text size="sm">{error}</Text>
            <Text size="sm">{alerts !== null ? 'Los datos anteriores pueden haber cambiado. Reintentá la consulta.' : 'No podemos determinar si hay alertas vigentes. Reintentá la consulta.'}</Text>
          </Alert>
        )}

        {loading && alerts === null && (
          <Stack gap="md" aria-label="Cargando alertas climáticas" aria-busy="true">
            {[0, 1].map(item => <Card key={item} radius="lg" withBorder p="lg"><Stack gap="md"><Skeleton height={24} width="70%" /><Skeleton height={18} width="50%" /><Skeleton height={70} /><Skeleton height={12} /></Stack></Card>)}
          </Stack>
        )}

        {alerts !== null && (
          <>
            <Stack gap="md">
              {summary.cards.map(alert => <WeatherAlertCard key={alert.id} alert={alert} now={now} onUpdated={() => { void load(); }} />)}
            </Stack>
            {summary.totalRelevant > summary.cards.length && <Text size="sm" c="dimmed">Mostrando {summary.cards.length} de {summary.totalRelevant} alertas confirmadas, priorizadas por criticidad. Consultá el listado completo en «Ver todas».</Text>}
            {!error && !loading && summary.totalRelevant === 0 && summary.invalidCount === 0 && (
              <Card radius="lg" withBorder p="lg">
                <Group wrap="nowrap" align="flex-start">
                  <IconInfoCircle size={22} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <Box><Text fw={600}>Sin alertas confirmadas vigentes o próximas</Text><Text size="sm" c="dimmed">Según la última consulta al sistema. Esto no garantiza ausencia de riesgo meteorológico.</Text></Box>
                </Group>
              </Card>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}
