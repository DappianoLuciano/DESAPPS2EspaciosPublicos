import { Alert, Badge, Box, Button, Card, Group, SimpleGrid, Stack, Table, Tabs, Text, Title, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconBike, IconChartLine, IconRefresh, IconTransfer } from '@tabler/icons-react';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip as MapTooltip } from 'react-leaflet';
import IntegrationMetricsPanel from '../components/IntegrationMetricsPanel';
import { getIntegrationOverview } from '../lib/api';
import type { IntegrationOverview } from '../lib/api';

const CABA_CENTER: [number, number] = [-34.6037, -58.4416];

const MODULES: Record<string, { label: string; color: string }> = {
  movilidad: { label: 'Movilidad', color: 'teal' },
  reclamos: { label: 'Reclamos', color: 'grape' },
  emergencias: { label: 'Emergencias', color: 'red' },
  espacios: { label: 'Espacios', color: 'blue' },
};

const moduleOf = (fqn: string) => fqn.split('.')[2] ?? '';
const shortName = (fqn: string) => fqn.split('.').slice(3).join('.');

const formatDateTime = (date: string | null) => (date
  ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date))
  : '-');

const since = (date: string) => {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `hace ${hours} h` : `hace ${Math.round(hours / 24)} días`;
};

function ModuleBadge({ fqn }: { fqn: string }) {
  const module = MODULES[moduleOf(fqn)] ?? { label: moduleOf(fqn), color: 'gray' };
  return <Badge variant="light" color={module.color}>{module.label}</Badge>;
}

function Stat({ label, value, hint, color }: { label: string; value: number; hint: string; color?: string }) {
  return (
    <Card withBorder padding="md">
      <Text fz="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
      <Text fz={28} fw={800} c={color}>{value}</Text>
      <Text fz="xs" c="dimmed">{hint}</Text>
    </Card>
  );
}

export default function Integrations() {
  const [data, setData] = useState<IntegrationOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getIntegrationOverview()
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const withStation = useMemo(() => data?.events.filter((event) => event.recommendation).length ?? 0, [data]);
  const located = useMemo(
    () => data?.incidents.filter((incident) => incident.latitude !== null && incident.longitude !== null) ?? [],
    [data],
  );
  const failed = useMemo(() => data?.outbox.byName.reduce((total, row) => total + row.failed, 0) ?? 0, [data]);
  const received = useMemo(() => data?.inbound.byType.reduce((total, row) => total + row.count, 0) ?? 0, [data]);

  return (
    <Box p={{ base: 'md', sm: 40 }}>
      <Group justify="space-between" align="flex-start" mb="lg">
        <Box>
          <Title order={1} fz={32}>Integraciones</Title>
          <Text c="dimmed" mt="xs">
            Qué recibimos de Movilidad, Reclamos y Emergencias, y qué publicamos para el resto de CityPass+.
          </Text>
        </Box>
        <Button variant="default" leftSection={<IconRefresh size="1rem" />} onClick={() => { setLoading(true); load(); }} loading={loading}>
          Actualizar
        </Button>
      </Group>

      {error && <Alert color="red" mb="md">{error}</Alert>}

      {data && (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
            <Stat label="Eventos con estación" value={withStation} hint={`de ${data.events.length} eventos próximos`} />
            <Stat label="Incidentes activos" value={data.incidents.length} hint="reclamos y emergencias" color={data.incidents.length ? 'orange' : undefined} />
            <Stat label="Eventos recibidos" value={received} hint="de otros módulos" />
            <Stat label="Publicaciones fallidas" value={failed} hint="tras agotar los reintentos" color={failed ? 'red' : 'green'} />
          </SimpleGrid>

          <Tabs defaultValue="indicadores">
            <Tabs.List mb="md">
              <Tabs.Tab value="indicadores" leftSection={<IconChartLine size="1rem" />}>Indicadores</Tabs.Tab>
              <Tabs.Tab value="movilidad" leftSection={<IconBike size="1rem" />}>Eventos y Movilidad</Tabs.Tab>
              <Tabs.Tab value="incidentes" leftSection={<IconAlertTriangle size="1rem" />}>Incidentes activos</Tabs.Tab>
              <Tabs.Tab value="mensajeria" leftSection={<IconTransfer size="1rem" />}>Mensajería</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="indicadores">
              <IntegrationMetricsPanel metrics={data.metrics} />
            </Tabs.Panel>

            <Tabs.Panel value="movilidad">
              <Text c="dimmed" fz="sm" mb="sm">
                Movilidad calcula la estación de bici recomendada para cada evento. El ciudadano la ve en el plan de llegada.
              </Text>
              {data.events.length === 0 ? <Alert color="gray">No hay eventos próximos.</Alert> : (
                <Table.ScrollContainer minWidth={760}>
                  <Table striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Evento</Table.Th>
                        <Table.Th>Espacio</Table.Th>
                        <Table.Th>Inicio</Table.Th>
                        <Table.Th>Estación recomendada</Table.Th>
                        <Table.Th>Calculada</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.events.map((event) => {
                        const rec = event.recommendation;
                        return (
                          <Table.Tr key={event.id}>
                            <Table.Td>
                              <Text fz="sm" fw={600}>{event.title}</Text>
                              {event.status === 'SUSPENDED' && <Badge size="xs" color="orange" variant="light">Suspendido</Badge>}
                            </Table.Td>
                            <Table.Td><Text fz="sm">{event.space.name ?? event.space.id}</Text><Text fz="xs" c="dimmed">{event.space.zone}</Text></Table.Td>
                            <Table.Td fz="sm">{formatDateTime(event.startDate)}</Table.Td>
                            <Table.Td>
                              {!rec && <Badge color="gray" variant="light">Pendiente de Movilidad</Badge>}
                              {rec?.estado === 'RECOMMENDED' && (
                                <Stack gap={2}>
                                  <Text fz="sm" fw={600}>{rec.estacion}</Text>
                                  <Text fz="xs" c="dimmed">
                                    {rec.lugaresLibres ?? '?'} lugares libres · {rec.distanciaMetros ?? '?'} m
                                    {rec.descartadasPorIncidentes > 0 && ` · ${rec.descartadasPorIncidentes} descartadas por incidentes`}
                                  </Text>
                                </Stack>
                              )}
                              {rec?.estado === 'NO_RECOMMENDATION' && (
                                <Tooltip label={rec.mensaje} multiline w={260}><Badge color="orange" variant="light">Sin estación</Badge></Tooltip>
                              )}
                            </Table.Td>
                            <Table.Td fz="sm">{rec ? since(rec.calculadaEn) : '-'}</Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="incidentes">
              <Text c="dimmed" fz="sm" mb="sm">
                Reclamos que cortan la circulación y emergencias abiertas. Se muestran en el plan de llegada de los eventos cercanos.
              </Text>
              {located.length > 0 && (
                <Box mb="md" style={{ height: 360, borderRadius: 8, overflow: 'hidden' }}>
                  <MapContainer center={CABA_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {located.map((incident) => (
                      <CircleMarker
                        key={`${incident.source}-${incident.externalId}`}
                        center={[incident.latitude!, incident.longitude!]}
                        radius={9}
                        pathOptions={{ color: incident.source === 'EMERGENCIAS' ? '#e03131' : '#9c36b5', fillOpacity: 0.6 }}
                      >
                        <MapTooltip>{incident.source === 'EMERGENCIAS' ? 'Emergencia' : 'Reclamo'} · {incident.category ?? 'sin categoría'}</MapTooltip>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </Box>
              )}
              {data.incidents.length === 0 ? <Alert color="green">No hay incidentes activos.</Alert> : (
                <Table.ScrollContainer minWidth={640}>
                  <Table striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Origen</Table.Th>
                        <Table.Th>Id</Table.Th>
                        <Table.Th>Categoría</Table.Th>
                        <Table.Th>Ubicación</Table.Th>
                        <Table.Th>Desde</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.incidents.map((incident) => (
                        <Table.Tr key={`${incident.source}-${incident.externalId}`}>
                          <Table.Td><Badge variant="light" color={incident.source === 'EMERGENCIAS' ? 'red' : 'grape'}>{incident.source === 'EMERGENCIAS' ? 'Emergencias' : 'Reclamos'}</Badge></Table.Td>
                          <Table.Td><Text ff="monospace" fz="xs">{incident.externalId}</Text></Table.Td>
                          <Table.Td fz="sm">{incident.category ?? '-'}</Table.Td>
                          <Table.Td fz="sm">{incident.latitude !== null ? 'En el mapa' : `Barrio ${incident.zone ?? '?'}`}</Table.Td>
                          <Table.Td fz="sm">{since(incident.reportedAt)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="mensajeria">
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                <Box>
                  <Title order={3} fz="lg" mb="xs">Recibidos</Title>
                  {data.inbound.byType.length === 0 ? <Alert color="gray">Todavía no recibimos eventos de otros módulos.</Alert> : (
                    <Table striped>
                      <Table.Thead><Table.Tr><Table.Th>Módulo</Table.Th><Table.Th>Evento</Table.Th><Table.Th>Cantidad</Table.Th><Table.Th>Último</Table.Th></Table.Tr></Table.Thead>
                      <Table.Tbody>
                        {data.inbound.byType.map((row) => (
                          <Table.Tr key={row.eventType}>
                            <Table.Td><ModuleBadge fqn={row.eventType} /></Table.Td>
                            <Table.Td fz="sm">{shortName(row.eventType)}</Table.Td>
                            <Table.Td fz="sm">{row.count}</Table.Td>
                            <Table.Td fz="sm">{since(row.lastReceivedAt)}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Box>
                <Box>
                  <Title order={3} fz="lg" mb="xs">Publicados</Title>
                  <Table striped>
                    <Table.Thead><Table.Tr><Table.Th>Evento</Table.Th><Table.Th>Publicados</Table.Th><Table.Th>Pendientes</Table.Th><Table.Th>Fallidos</Table.Th><Table.Th>Último</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                      {data.outbox.byName.map((row) => (
                        <Table.Tr key={row.name}>
                          <Table.Td fz="sm">{shortName(row.name)}</Table.Td>
                          <Table.Td fz="sm">{row.published}</Table.Td>
                          <Table.Td fz="sm" c={row.pending ? 'orange' : undefined}>{row.pending}</Table.Td>
                          <Table.Td fz="sm" c={row.failed ? 'red' : undefined} fw={row.failed ? 700 : undefined}>{row.failed}</Table.Td>
                          <Table.Td fz="sm">{row.lastCreatedAt ? since(row.lastCreatedAt) : '-'}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Box>
              </SimpleGrid>

              {data.outbox.problems.length > 0 && (
                <Box mt="xl">
                  <Title order={3} fz="lg" mb="xs">Publicaciones con problemas</Title>
                  <Table striped>
                    <Table.Thead><Table.Tr><Table.Th>Evento</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Intentos</Table.Th><Table.Th>Error</Table.Th><Table.Th>Creado</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                      {data.outbox.problems.map((row) => (
                        <Table.Tr key={row.id}>
                          <Table.Td fz="sm">{shortName(row.name)}</Table.Td>
                          <Table.Td><Badge color={row.status === 'FAILED' ? 'red' : 'orange'} variant="light">{row.status === 'FAILED' ? 'Fallido' : 'Reintentando'}</Badge></Table.Td>
                          <Table.Td fz="sm">{row.attempts}</Table.Td>
                          <Table.Td><Text fz="xs" lineClamp={2}>{row.lastError ?? '-'}</Text></Table.Td>
                          <Table.Td fz="sm">{formatDateTime(row.createdAt)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Box>
              )}
            </Tabs.Panel>
          </Tabs>

          <Text fz="xs" c="dimmed" mt="lg">Actualizado {formatDateTime(data.generatedAt)}</Text>
        </>
      )}
    </Box>
  );
}
