import { Badge, Box, Button, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconCloud, IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { formatWeatherDate, summarizeWeatherAlerts } from '../lib/weatherAlertPresentation';
import styles from './WeatherDashboard.module.css';

export default function WeatherAlertOverview({ summary, pendingRelease, updatedAt, loading, stale, onRefresh, hasData }: {
  summary: ReturnType<typeof summarizeWeatherAlerts>; pendingRelease: number; updatedAt: string | null;
  loading: boolean; stale: boolean; hasData: boolean; onRefresh: () => void;
}) {
  const reviewCount = summary.expiredCount + summary.invalidCount + pendingRelease;
  const hasDock = hasData && (summary.pendingCount > 0 || reviewCount > 0);
  return (
    <div className={`${styles.header} ${hasDock ? styles.headerWithDock : ''}`}>
      <Box style={{ minWidth: 0 }}>
        <Group gap="md" wrap="nowrap">
          <IconCloud size={32} color="var(--mantine-color-blue-8)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <Box>
            <Title order={2} fz={{ base: 25, sm: 30 }} lh={1.2} id="dashboard-weather-title">Alertas climáticas</Title>
            <Text size="sm" c="dimmed" mt={4}>Alertas confirmadas vigentes o próximas. No es un reporte del clima actual.</Text>
          </Box>
        </Group>
        <Group gap="xs" mt="lg">
          {hasData && <><Badge color="blue" variant="light" radius="xl">{summary.activeCount} vigentes</Badge>
            <Badge color="gray" variant="light" radius="xl">{summary.upcomingCount} próximas</Badge></>}
          {updatedAt && <Text size="xs" c="dimmed" title="Última lectura · hora de Buenos Aires">{formatWeatherDate(updatedAt)}{stale ? ' · Sin actualizar' : ''}</Text>}
        </Group>
        <Group gap="xs" justify="flex-end" mt="sm">
          <Button variant="default" size="xs" leftSection={<IconRefresh size={14} />} loading={loading} onClick={onRefresh}>Actualizar</Button>
          <Button component={Link} to="/admin/weather-alerts" variant="light" size="xs">Ver todas</Button>
        </Group>
      </Box>
      {hasDock && <div className={styles.dock} aria-label="Atención de alertas">
        {summary.pendingCount > 0 && <Box className={styles.capsule} bg="blue.0" c="blue.9" style={{ borderColor: 'var(--mantine-color-blue-2)' }}>
          <Group align="flex-start" wrap="nowrap" gap="sm">
            <ThemeIcon size={28} radius="sm" variant="light" color="blue"><IconInfoCircle size={18} /></ThemeIcon>
            <Box><Text size="sm" fw={700}>{summary.pendingCount} por validar</Text>
              <Text size="xs" c="dimmed" mt={2}>Todavía no son alertas confirmadas.</Text></Box>
          </Group>
          <Link className={styles.capsuleLink} style={{ color: 'inherit', borderColor: 'var(--mantine-color-blue-2)' }} to="/admin/weather-alerts">Revisar gestión →</Link>
        </Box>}
        {reviewCount > 0 && <Box className={styles.capsule} bg="yellow.0" c="orange.9" style={{ borderColor: 'var(--mantine-color-yellow-2)' }}>
          <Group align="flex-start" wrap="nowrap" gap="sm">
            <ThemeIcon size={28} radius="sm" variant="light" color="yellow"><IconAlertTriangle size={18} /></ThemeIcon>
            <Box><Text size="sm" fw={700}>{reviewCount} requieren revisión</Text>
              <Stack gap={2} mt={2}>
                {summary.expiredCount > 0 && <Text size="xs">{summary.expiredCount} con vigencia vencida y sin cierre.</Text>}
                {summary.invalidCount > 0 && <Text size="xs">{summary.invalidCount} con fechas inválidas.</Text>}
                {pendingRelease > 0 && <Text size="xs">{pendingRelease} finalizadas con medidas pendientes.</Text>}
              </Stack>
            </Box>
          </Group>
          <Link className={styles.capsuleLink} style={{ color: 'inherit', borderColor: 'var(--mantine-color-yellow-3)' }} to="/admin/weather-alerts">Revisar alertas →</Link>
        </Box>}
      </div>}
    </div>
  );
}
