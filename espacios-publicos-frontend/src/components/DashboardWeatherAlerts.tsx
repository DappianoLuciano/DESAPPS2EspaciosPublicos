import { Alert, Badge, Box, Button, Card, Flex, Group, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconCloudStorm, IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listWeatherAlerts } from '../lib/api';
import type { WeatherAlert } from '../lib/api';
import { formatWeatherDate, summarizeWeatherAlerts } from '../lib/weatherAlertPresentation';
import WeatherAlertCard from './WeatherAlertCard';

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
    <Box component="section" aria-labelledby="dashboard-weather-title" mb={32}>
      <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="md" mb="md">
        <Box>
          <Group gap="xs">
            <IconCloudStorm size={22} aria-hidden="true" />
            <Title order={2} fz={22} id="dashboard-weather-title">Alertas climáticas</Title>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>Alertas confirmadas vigentes o próximas. No es un reporte del clima actual.</Text>
        </Box>
        <Group gap="xs">
          <Button variant="default" size="sm" leftSection={<IconRefresh size={16} />} loading={loading}
            onClick={() => { setLoading(true); void load(); }}>Actualizar listado</Button>
          <Button component={Link} to="/admin/weather-alerts" variant="light" size="sm">Ver todas</Button>
        </Group>
      </Flex>

      <Stack gap="md">
        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={20} />} title="No se pudieron actualizar las alertas">
            <Text size="sm">{error}</Text>
            <Text size="sm">{alerts !== null ? 'Los datos anteriores pueden haber cambiado. Reintentá la consulta.' : 'No podemos determinar si hay alertas vigentes. Reintentá la consulta.'}</Text>
          </Alert>
        )}

        {loading && alerts === null && (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" aria-label="Cargando alertas climáticas" aria-busy="true">
            {[0, 1].map(item => <Card key={item} radius="lg" withBorder p="lg"><Stack gap="md"><Skeleton height={24} width="70%" /><Skeleton height={18} width="50%" /><Skeleton height={70} /><Skeleton height={12} /></Stack></Card>)}
          </SimpleGrid>
        )}

        {alerts !== null && (
          <>
            <Group gap="xs">
              <Badge color="gray" variant="light">{summary.activeCount} vigentes</Badge>
              <Badge color="gray" variant="light">{summary.upcomingCount} próximas</Badge>
              {updatedAt && <Text size="xs" c="dimmed">Última lectura: {formatWeatherDate(updatedAt)} (Buenos Aires){error ? ' · Sin actualizar' : ''}</Text>}
            </Group>
            {pendingRelease > 0 && <Alert color="yellow" title="Medidas pendientes de levantar">
              {pendingRelease} alerta{pendingRelease === 1 ? '' : 's'} finalizada{pendingRelease === 1 ? '' : 's'} conserva{pendingRelease === 1 ? '' : 'n'} restricciones. Revisalas en «Ver todas» para confirmar su levantamiento.
            </Alert>}
            {summary.pendingCount > 0 && (
              <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />} title={`${summary.pendingCount} pendiente${summary.pendingCount === 1 ? '' : 's'} de validación`}>
                Todavía no son alertas confirmadas. Revisalas desde la gestión de alertas.
              </Alert>
            )}
            {(summary.expiredCount > 0 || summary.invalidCount > 0) && (
              <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title="Hay alertas que requieren revisión">
                {summary.expiredCount > 0 && <Text size="sm">{summary.expiredCount} confirmada{summary.expiredCount === 1 ? '' : 's'} con vigencia vencida y sin cierre registrado.</Text>}
                {summary.invalidCount > 0 && <Text size="sm">{summary.invalidCount} confirmada{summary.invalidCount === 1 ? '' : 's'} con fechas inválidas.</Text>}
                <Text size="sm">Consultá su estado en la gestión de alertas. Este panel no ejecuta cierres automáticos.</Text>
              </Alert>
            )}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {summary.cards.map(alert => <WeatherAlertCard key={alert.id} alert={alert} now={now} onUpdated={() => { void load(); }} />)}
            </SimpleGrid>
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
