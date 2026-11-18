import { Badge, Box, Card, Grid, Group, Progress, SimpleGrid, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { IntegrationMetrics } from '../lib/api';

const MODULE_LABELS: Record<string, { label: string; color: string }> = {
  movilidad: { label: 'Movilidad', color: 'teal' },
  reclamos: { label: 'Reclamos', color: 'grape' },
  emergencias: { label: 'Emergencias', color: 'red' },
  clima: { label: 'Clima', color: 'cyan' },
  espacios: { label: 'Espacios', color: 'blue' },
};

const PUBLISHED_COLOR = 'var(--mantine-color-blue-6)';
const RECEIVED_COLOR = 'var(--mantine-color-teal-6)';

const percent = (value: number | null) => (value === null ? '—' : `${Math.round(value * 1000) / 10}%`);

function seconds(value: number | null) {
  if (value === null) return '—';
  if (value < 60) return `${value.toLocaleString('es-AR')} s`;
  const minutes = value / 60;
  return minutes < 60 ? `${Math.round(minutes)} min` : `${Math.round(minutes / 60)} h`;
}

function Kpi({ label, value, hint, how, color }: { label: string; value: string; hint: ReactNode; how: string; color?: string }) {
  return (
    <Card withBorder padding="md">
      <Group gap={4} wrap="nowrap">
        <Text fz="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
        <Tooltip label={how} multiline w={280} withArrow>
          <IconInfoCircle size="0.9rem" color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} aria-label={`Cómo se calcula: ${how}`} />
        </Tooltip>
      </Group>
      <Text fz={28} fw={800} c={color}>{value}</Text>
      <Text fz="xs" c="dimmed">{hint}</Text>
    </Card>
  );
}

function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <Text span fz="xs" c="dimmed">sin datos de la semana anterior</Text>;
  const change = Math.round(((current - previous) / previous) * 100);
  const color = change === 0 ? 'gray' : change > 0 ? 'teal' : 'orange';
  return (
    <Text span fz="xs" c={color} fw={600}>
      {change > 0 ? '+' : ''}{change}% vs. semana anterior ({previous})
    </Text>
  );
}

function deliveryColor(rate: number | null) {
  if (rate === null) return undefined;
  if (rate >= 0.99) return 'green';
  return rate >= 0.9 ? 'orange' : 'red';
}

const dayLabel = (date: string) => {
  const [, month, day] = date.split('-');
  return `${Number(day)}/${Number(month)}`;
};

function DailyChart({ daily }: { daily: IntegrationMetrics['daily'] }) {
  const max = Math.max(1, ...daily.flatMap((day) => [day.published, day.received]));
  return (
    <Box>
      <Group gap="md" mb="xs">
        <Group gap={6}><Box w={10} h={10} style={{ background: PUBLISHED_COLOR, borderRadius: 2 }} /><Text fz="xs">Publicados</Text></Group>
        <Group gap={6}><Box w={10} h={10} style={{ background: RECEIVED_COLOR, borderRadius: 2 }} /><Text fz="xs">Recibidos</Text></Group>
      </Group>
      <Box style={{ display: 'grid', gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))`, gap: 4, alignItems: 'end', height: 160 }}>
        {daily.map((day) => (
          <Tooltip key={day.date} label={`${dayLabel(day.date)}: ${day.published} publicados · ${day.received} recibidos`} withArrow>
            <Box style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}>
              <Box style={{ flex: 1, background: PUBLISHED_COLOR, height: `${(day.published / max) * 100}%`, minHeight: day.published ? 2 : 0, borderRadius: '2px 2px 0 0' }} />
              <Box style={{ flex: 1, background: RECEIVED_COLOR, height: `${(day.received / max) * 100}%`, minHeight: day.received ? 2 : 0, borderRadius: '2px 2px 0 0' }} />
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Box style={{ display: 'grid', gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))`, gap: 4 }} mt={4}>
        {daily.map((day, index) => (
          <Text key={day.date} fz={10} c="dimmed" ta="center">{index % 2 === daily.length % 2 ? dayLabel(day.date) : ''}</Text>
        ))}
      </Box>
    </Box>
  );
}

/** Indicadores de la mensajeria con el resto de CityPass+ (ultimos 7 dias). */
export default function IntegrationMetricsPanel({ metrics }: { metrics: IntegrationMetrics }) {
  const { delivery, latencySeconds, mobility, windowDays } = metrics;
  const moduleMax = Math.max(1, ...metrics.receivedByModule.map((row) => row.count));

  return (
    <Stack gap="xl">
      <Text c="dimmed" fz="sm">
        Cómo funciona la integración de Espacios Públicos con el bus de eventos en los últimos {windowDays} días.
        Pasá el mouse por el ícono de cada indicador para ver cómo se calcula.
      </Text>

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
        <Kpi
          label="Tasa de entrega"
          value={percent(delivery.rate)}
          color={deliveryColor(delivery.rate)}
          hint={`${delivery.published} publicados · ${delivery.failed} fallidos${delivery.pending ? ` · ${delivery.pending} en reintento` : ''}`}
          how="De los eventos que generamos en la semana, qué porcentaje aceptó el gateway: publicados / (publicados + fallidos definitivos). Los que siguen reintentando no cuentan todavía."
        />
        <Kpi
          label="Latencia de publicación"
          value={seconds(latencySeconds.median)}
          hint={`mediana · el 95% en menos de ${seconds(latencySeconds.p95)}`}
          how="Tiempo entre que se genera el evento (se guarda en el outbox) y que el gateway lo acepta. Mediana y percentil 95 de los publicados en la semana."
        />
        <Kpi
          label="Recuperados por reintento"
          value={String(delivery.recoveredByRetry)}
          color={delivery.recoveredByRetry ? 'teal' : undefined}
          hint="fallaron al publicarse y el outbox los reenvió"
          how="Eventos publicados que fallaron al menos una vez (gateway caído o lento) y el worker del outbox reenvió con backoff exponencial. Sin el outbox se habrían perdido."
        />
        <Kpi
          label="Cobertura de Movilidad"
          value={percent(mobility.coverage)}
          hint={`${mobility.withRecommendation} de ${mobility.upcoming} eventos próximos · ${mobility.fresh} calculadas en las últimas 24 h`}
          how="Eventos próximos (no cancelados ni terminados) para los que Movilidad ya nos mandó la estación de bici recomendada por RecomendacionDestinoActualizada."
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Card withBorder padding="md">
          <Text fz="xs" c="dimmed" tt="uppercase" fw={700}>Publicados por nosotros</Text>
          <Text fz={28} fw={800}>{metrics.published.current}</Text>
          <Trend {...metrics.published} />
        </Card>
        <Card withBorder padding="md">
          <Text fz="xs" c="dimmed" tt="uppercase" fw={700}>Recibidos de otros módulos</Text>
          <Text fz={28} fw={800}>{metrics.received.current}</Text>
          <Trend {...metrics.received} />
        </Card>
      </SimpleGrid>

      <Grid gap="xl">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card withBorder padding="md" h="100%">
            <Title order={3} fz="md" mb="sm">Actividad diaria (últimos {metrics.daily.length} días)</Title>
            <DailyChart daily={metrics.daily} />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card withBorder padding="md" h="100%">
            <Title order={3} fz="md" mb="sm">Recibidos por módulo ({windowDays} días)</Title>
            {metrics.receivedByModule.length === 0 ? (
              <Text fz="sm" c="dimmed">No recibimos eventos esta semana.</Text>
            ) : (
              <Stack gap="sm">
                {metrics.receivedByModule.map((row) => {
                  const module = MODULE_LABELS[row.module] ?? { label: row.module, color: 'gray' };
                  return (
                    <Box key={row.module}>
                      <Group justify="space-between" mb={4}>
                        <Badge variant="light" color={module.color}>{module.label}</Badge>
                        <Text fz="sm" fw={600}>{row.count}</Text>
                      </Group>
                      <Progress value={(row.count / moduleMax) * 100} color={module.color} size="sm" aria-label={`${module.label}: ${row.count}`} />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
