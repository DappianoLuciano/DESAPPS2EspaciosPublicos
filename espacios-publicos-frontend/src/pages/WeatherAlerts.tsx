import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Container,
  Flex,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { IconCloudStorm, IconRefresh, IconShieldCheck } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import {
  checkWeatherNow,
  confirmWeatherAlert,
  dismissWeatherAlert,
  finalizeWeatherAlert,
  listWeatherAlerts,
  listWeatherLocations,
  createManualWeatherAlert,
} from '../lib/api';
import type { WeatherAlert, WeatherCriticality, WeatherPhenomenon, WeatherLocation } from '../lib/api';

const criticalityColors: Record<WeatherCriticality, string> = {
  BAJA: 'blue',
  MEDIA: 'yellow',
  ALTA: 'orange',
  CRITICA: 'red',
};

const statusLabels = {
  PENDING: 'Pendiente de validación',
  CONFIRMED: 'Confirmada',
  DISMISSED: 'Descartada',
  FINALIZED: 'Finalizada',
};

const phenomenonLabels: Record<WeatherPhenomenon, string> = {
  TORMENTA_FUERTE: 'Tormenta fuerte',
  LLUVIA_INTENSA: 'Lluvia intensa',
  VIENTO_FUERTE: 'Viento fuerte',
  OLA_DE_CALOR: 'Ola de calor',
  OLA_DE_FRIO: 'Ola de frío',
  GRANIZO: 'Granizo',
  TORMENTA_ELECTRICA: 'Tormenta eléctrica',
  HURACAN: 'Huracán',
  NIEVE: 'Nieve',
};

export default function WeatherAlerts() {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<WeatherAlert | null>(null);
  const [action, setAction] = useState<'confirm' | 'dismiss' | null>(null);
  const [criticality, setCriticality] = useState<WeatherCriticality>('ALTA');
  const [validUntil, setValidUntil] = useState('');
  const [dismissalReason, setDismissalReason] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCriticality, setPreviewCriticality] = useState<WeatherCriticality>('ALTA');
  const [previewPhenomenon, setPreviewPhenomenon] = useState<WeatherPhenomenon>('TORMENTA_FUERTE');
  const [previewUntil, setPreviewUntil] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [manualPhenomenon, setManualPhenomenon] = useState<WeatherPhenomenon>('TORMENTA_ELECTRICA');
  const [manualCriticality, setManualCriticality] = useState<WeatherCriticality>('ALTA');
  const [manualFrom, setManualFrom] = useState('');
  const [manualUntil, setManualUntil] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualSource, setManualSource] = useState('');
  const [manualGust, setManualGust] = useState<string | number>('');
  const [manualRain, setManualRain] = useState<string | number>('');
  const [manualTempMin, setManualTempMin] = useState<string | number>('');
  const [manualTempMax, setManualTempMax] = useState<string | number>('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [messageAlert, setMessageAlert] = useState<WeatherAlert | null>(null);
  const selectedManualLocations = locations.filter((location) => manualIds.includes(location.id));
  const manualPayload = {
    alertaId: '(se asigna al guardar)',
    nivelCriticidad: manualCriticality,
    fenomeno: manualPhenomenon,
    ubicaciones: selectedManualLocations.map(({ latitude, longitude }) => ({ latitud: latitude, longitud: longitude })),
    vigenciaDesde: dateTimestamp(manualFrom),
    vigenciaHasta: dateTimestamp(manualUntil),
    temperaturaMinC: numericValue(manualTempMin) ?? null,
    temperaturaMaxC: numericValue(manualTempMax) ?? null,
    actorSub: currentActorId(),
  };

  useEffect(() => {
    let active = true;
    listWeatherLocations().then((items) => { if (active) setLocations(items); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const openManual = async () => {
    setManualOpen(true);
    setManualError(null);
    setManualIds([]);
    setManualReason('');
    setManualSource('');
    setManualGust('');
    setManualRain('');
    setManualTempMin('');
    setManualTempMax('');
    setManualFrom(toLocalInputValue(new Date().toISOString()));
    setManualUntil(toLocalInputValue(new Date(Date.now() + 6 * 3600_000).toISOString()));
    setLoadingLocations(true);
    try {
      setLocations(await listWeatherLocations());
    } catch (err) {
      setLocations([]);
      setManualError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
    } finally {
      setLoadingLocations(false);
    }
  };

  const submitManual = async () => {
    setSubmitting(true);
    setManualError(null);
    try {
      if (!manualFrom || !manualUntil || !manualIds.length) {
        throw new Error('Completá las fechas y seleccioná al menos un barrio.');
      }
      await createManualWeatherAlert({
        fenomeno: manualPhenomenon, nivelCriticidad: manualCriticality,
        ubicacionesIds: manualIds,
        vigenciaDesde: new Date(manualFrom).toISOString(),
        vigenciaHasta: new Date(manualUntil).toISOString(),
        motivo: manualReason, fuente: manualSource,
        rafagaMaxKmh: numericValue(manualGust),
        precipitacionAcumuladaMm: numericValue(manualRain),
        temperaturaMinC: numericValue(manualTempMin),
        temperaturaMaxC: numericValue(manualTempMax),
      });
      setManualOpen(false);
      setNotice('Alerta manual creada como pendiente. Revisala y confirmala para publicar el mensaje.');
      await loadAlerts();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'No se pudo crear la alerta.');
    } finally {
      setSubmitting(false);
    }
  };

  const previewPayload = {
    alertaId: '550e8400-e29b-41d4-a716-446655440001',
    nivelCriticidad: previewCriticality,
    fenomeno: previewPhenomenon,
    ubicaciones: [
      { latitud: -34.6037, longitud: -58.3816 },
      { latitud: -34.5631, longitud: -58.4584 },
    ],
    vigenciaDesde: previewUntil ? new Date(previewUntil).getTime() - 6 * 60 * 60_000 : null,
    vigenciaHasta: previewUntil ? new Date(previewUntil).getTime() : null,
    actorSub: 'admin-demo',
    temperaturaMinC: null,
    temperaturaMaxC: null,
  };

  const openMessageDemo = () => {
    setPreviewUntil(toLocalInputValue(new Date(Date.now() + 6 * 60 * 60_000).toISOString()));
    setPreviewOpen(true);
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      setAlerts(await listWeatherAlerts());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las alertas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    listWeatherAlerts()
      .then((items) => {
        if (!active) return;
        setAlerts(items);
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las alertas.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const pendingCount = useMemo(
    () => alerts.filter((alert) => alert.status === 'PENDING').length,
    [alerts]
  );
  const activeCount = useMemo(
    () => alerts.filter((alert) => alert.status === 'CONFIRMED').length,
    [alerts]
  );

  const runCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const result = await checkWeatherNow();
      setNotice(result.weatherCheck.message);
      await loadAlerts();
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'No se pudo consultar el clima.');
    } finally {
      setChecking(false);
    }
  };

  const openConfirm = (alert: WeatherAlert) => {
    setSelected(alert);
    setAction('confirm');
    setCriticality(alert.suggestedCriticality);
    setValidUntil(toLocalInputValue(alert.validUntil));
  };

  const openDismiss = (alert: WeatherAlert) => {
    setSelected(alert);
    setAction('dismiss');
    setDismissalReason('');
  };

  const submitAction = async () => {
    if (!selected || !action) return;
    setSubmitting(true);
    setError(null);
    try {
      if (action === 'confirm') {
        if (!validUntil) throw new Error('Indicá hasta cuándo estará vigente la alerta.');
        const result = await confirmWeatherAlert(selected.id, {
          nivelCriticidad: criticality,
          vigenciaHasta: new Date(validUntil).toISOString(),
        });
        setNotice(
          result.delivery.failed > 0
            ? 'La alerta fue confirmada. El mensaje quedó pendiente de reintento en Outbox.'
            : 'La alerta fue confirmada y su mensaje fue procesado por el EventBus.'
        );
      } else {
        await dismissWeatherAlert(selected.id, dismissalReason);
        setNotice('La alerta fue descartada como falso positivo y no se publicó ningún evento.');
      }
      setAction(null);
      setSelected(null);
      await loadAlerts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo procesar la alerta.');
    } finally {
      setSubmitting(false);
    }
  };

  const finalize = async (alert: WeatherAlert) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await finalizeWeatherAlert(alert.id);
      setNotice(
        result.delivery.failed > 0
          ? 'La alerta finalizó. El evento de cierre quedó pendiente de reintento.'
          : 'La alerta finalizó y se emitió el evento de cierre.'
      );
      await loadAlerts();
    } catch (finalizeError) {
      setError(finalizeError instanceof Error ? finalizeError.message : 'No se pudo finalizar la alerta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="xl" py={40}>
      <Modal opened={messageAlert !== null} onClose={() => setMessageAlert(null)}
        title="Mensaje de esta alerta para EDA" size="lg" centered>
        {messageAlert && (
          <Flex direction="column" gap="md">
            <Alert color="blue">
              Vista del payload de confirmación a partir del registro.
              No publica mensajes ni confirma entrega a EDA.
              {messageAlert.status === 'PENDING' && ' El nivel y el fin pueden ajustarse al confirmar.'}
              {messageAlert.status === 'DISMISSED' && ' Esta alerta fue descartada: no se publica.'}
            </Alert>
            <Text fw={600}>{phenomenonLabels[messageAlert.phenomenon]}</Text>
            <Text size="sm">Inicio: {formatDate(messageAlert.validFrom)} · Fin: {formatDate(messageAlert.validUntil)}</Text>
            <Code block style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {JSON.stringify(alertMessagePayload(messageAlert), null, 2)}
            </Code>
            {messageAlert.status === 'FINALIZED' && (
              <>
                <Text fw={600}>Payload de finalización</Text>
                <Code block>{JSON.stringify({
                  alertaId: messageAlert.id,
                  finalizadaEn: dateTimestamp(messageAlert.finalizedAt || ''),
                  actorSub: messageAlert.finalizedBy || '(no disponible)',
                }, null, 2)}</Code>
              </>
            )}
          </Flex>
        )}
      </Modal>
      <Modal opened={manualOpen} onClose={() => { if (!submitting) setManualOpen(false); }}
        title="Crear alerta climática manual" size="lg" centered>
        <Flex direction="column" gap="md">
          <Alert color="blue">Se guardará como pendiente. La publicación requiere una confirmación posterior.
            Si es un ejercicio, indicá SIMULACRO en el motivo y usá el entorno de prueba acordado.</Alert>
          {manualError && <Alert color="red">{manualError}</Alert>}
          <Select label="Fenómeno" value={manualPhenomenon}
            data={Object.entries(phenomenonLabels).map(([value, label]) => ({ value, label }))}
            onChange={(value) => { if (value) setManualPhenomenon(value as WeatherPhenomenon); }} />
          <Select label="Criticidad sugerida" value={manualCriticality} data={['BAJA', 'MEDIA', 'ALTA', 'CRITICA']}
            onChange={(value) => { if (value) setManualCriticality(value as WeatherCriticality); }} />
          <MultiSelect label="Ubicaciones (seleccionar barrios)" placeholder={loadingLocations ? 'Cargando catálogo...' : 'Buscá uno o varios barrios'}
            searchable clearable disabled={loadingLocations} value={manualIds} onChange={setManualIds}
            data={locations.map((location) => ({ value: location.id, label: location.name }))} />
          <Text size="sm" c="dimmed">Catálogo GCBA: puntos representativos aproximados.
            Los barrios quedan en el registro interno; EDA recibe únicamente las coordenadas.</Text>
          {manualIds.map((id) => {
            const location = locations.find((item) => item.id === id);
            return location && <Text size="sm" key={id}>{location.name}: {location.latitude}, {location.longitude}</Text>;
          })}
          <TextInput label="Vigencia desde" type="datetime-local" value={manualFrom}
            onChange={(event) => setManualFrom(event.currentTarget.value)} />
          <TextInput label="Vigencia hasta (fin previsto)" type="datetime-local" value={manualUntil}
            onChange={(event) => setManualUntil(event.currentTarget.value)} />
          <Text fw={500}>Datos meteorológicos opcionales</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <NumberInput label="Ráfaga máxima estimada (km/h)" min={0} value={manualGust} onChange={setManualGust} />
            <NumberInput label="Precipitación acumulada estimada (mm)" min={0} value={manualRain} onChange={setManualRain} />
            <NumberInput label="Temperatura mínima prevista (°C)" min={-273.15} value={manualTempMin} onChange={setManualTempMin} />
            <NumberInput label="Temperatura máxima prevista (°C)" min={-273.15} value={manualTempMax} onChange={setManualTempMax} />
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            Valores de la fuente para el período indicado. Dejá vacío lo que no conozcas.
            La temperatura es informativa; no determina automáticamente una ola de calor o frío.
          </Text>
          <Textarea label="Motivo / descripción" required maxLength={1000} value={manualReason}
            onChange={(event) => setManualReason(event.currentTarget.value)} />
          <TextInput label="Fuente de respaldo" placeholder="Organismo, referencia o URL del aviso" required maxLength={1000}
            value={manualSource} onChange={(event) => setManualSource(event.currentTarget.value)} />
          <Text size="sm" c="dimmed">El motivo, la fuente y los barrios son evidencia interna; no forman parte del mensaje EDA.</Text>
          <Text fw={600}>Vista previa del mensaje al confirmar</Text>
          <Code block style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {JSON.stringify(manualPayload, null, 2)}
          </Code>
          <Text size="sm" c="dimmed">El ID se asigna al guardar. actorSub corresponderá a quien confirme la alerta.</Text>
          <Button loading={submitting} disabled={loadingLocations || !locations.length} onClick={submitManual}>
            Guardar como pendiente
          </Button>
        </Flex>
      </Modal>
      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Demo del mensaje climático para EDA"
        size="lg"
        centered
      >
        <Flex direction="column" gap="md">
          <Alert color="blue" title="Simulación para el equipo">
            Datos de ejemplo. Esta vista no confirma alertas, no guarda en la base ni publica en EDA.
          </Alert>
          <Select
            label="Fenómeno de ejemplo"
            data={Object.entries(phenomenonLabels).map(([value, label]) => ({ value, label }))}
            value={previewPhenomenon}
            onChange={(value) => { if (value) setPreviewPhenomenon(value as WeatherPhenomenon); }}
          />
          <Text size="sm" c="dimmed">
            Las coordenadas identifican el punto consultado, no el área completa de afectación.
            Calor, frío y huracán están en el catálogo, pero su detección automática aún no está implementada.
          </Text>
          <Select
            label="Criticidad de ejemplo"
            data={['BAJA', 'MEDIA', 'ALTA', 'CRITICA']}
            value={previewCriticality}
            onChange={(value) => { if (value) setPreviewCriticality(value as WeatherCriticality); }}
          />
          <TextInput
            type="datetime-local"
            label="Vigente hasta (hora local)"
            value={previewUntil}
            onChange={(event) => setPreviewUntil(event.currentTarget.value)}
          />
          <Alert color={criticalityColors[previewCriticality]} title={`Alerta ${previewCriticality}: ${phenomenonLabels[previewPhenomenon]} en CABA`}>
            {previewUntil ? `Vigente hasta ${formatDate(previewUntil)}.` : 'Seleccioná la vigencia.'}
            {' '}Cada módulo evalúa su política de contingencia.
          </Alert>
          <Text fw={600}>Tipo de evento configurado por defecto</Text>
          <Code block>com.citypass.espacios.CriticidadClimaticaConfirmada</Code>
          <Text fw={600}>Body JSON enviado al gateway</Text>
          <Code block style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {JSON.stringify(previewPayload, null, 2)}
          </Code>
          <Text fw={600}>Mensaje posterior: CriticidadClimaticaFinalizada</Text>
          <Code block>{JSON.stringify({
            alertaId: previewPayload.alertaId,
            finalizadaEn: previewPayload.vigenciaHasta,
            actorSub: 'admin-demo',
          }, null, 2)}</Code>
          <Text size="sm">El cierre es otro mensaje con el mismo alertaId. No sobrescribe la confirmación.</Text>
          <Text size="sm" c="dimmed">
            El backend arma este payload al confirmar. Outbox guarda ID, nombre, payload y fecha del evento.
            El adaptador publica solo el payload en POST /event-types/&#123;nombre&#125;/events.
            vigenciaHasta se transmite como timestamp Unix en milisegundos; actorSub identifica al administrador.
            El contrato está sujeto al acuerdo con EDA y el nombre puede configurarse en el backend.
          </Text>
          <Button variant="default" onClick={() => setPreviewOpen(false)}>Cerrar demo</Button>
        </Flex>
      </Modal>
      <Modal
        opened={action !== null}
        onClose={() => setAction(null)}
        title={action === 'confirm' ? 'Confirmar criticidad climática' : 'Descartar alerta'}
        centered
      >
        {action === 'confirm' ? (
          <Flex direction="column" gap="md">
            <Select
              label="Nivel confirmado"
              data={['BAJA', 'MEDIA', 'ALTA', 'CRITICA']}
              value={criticality}
              onChange={(value) => setCriticality(value as WeatherCriticality)}
            />
            <TextInput
              type="datetime-local"
              label="Vigente hasta"
              value={validUntil}
              onChange={(event) => setValidUntil(event.currentTarget.value)}
            />
            {selected && (
              <>
                <Text size="sm">Inicio: {formatDate(selected.validFrom)}</Text>
                <Text fw={600}>Mensaje de confirmación</Text>
                <Code block style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {JSON.stringify({
                    ...alertMessagePayload(selected),
                    nivelCriticidad: criticality,
                    vigenciaHasta: dateTimestamp(validUntil),
                    actorSub: currentActorId(),
                  }, null, 2)}
                </Code>
              </>
            )}
          </Flex>
        ) : (
          <Textarea
            label="Motivo"
            placeholder="Ej.: falso positivo contrastado con la fuente oficial"
            minRows={3}
            value={dismissalReason}
            onChange={(event) => setDismissalReason(event.currentTarget.value)}
          />
        )}
        <Flex justify="flex-end" gap="sm" mt="xl">
          <Button variant="default" onClick={() => setAction(null)}>Cancelar</Button>
          <Button
            color={action === 'dismiss' ? 'red' : 'green'}
            loading={submitting}
            onClick={submitAction}
          >
            {action === 'confirm' ? 'Confirmar y publicar' : 'Descartar'}
          </Button>
        </Flex>
      </Modal>

      <Box mb="xl">
        <Box mb="lg">
          <Title order={1} fz={32}>Alertas climáticas</Title>
          <Text c="dimmed">Detección automática con validación humana antes de informar a CityPass+.</Text>
        </Box>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Button fullWidth leftSection={<IconRefresh size="1rem" />} loading={checking} onClick={runCheck}>
            Consultar clima ahora
          </Button>
          <Button fullWidth variant="outline" onClick={openManual}>Crear alerta manual</Button>
          <Button fullWidth variant="light" onClick={openMessageDemo}>Ver mensaje (demo)</Button>
        </SimpleGrid>
      </Box>

      {error && <Alert color="red" mb="lg">{error}</Alert>}
      {notice && <Alert color="green" mb="lg" withCloseButton onClose={() => setNotice(null)}>{notice}</Alert>}

      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">
        <Card withBorder>
          <Group justify="space-between">
            <Box><Text c="dimmed">Pendientes</Text><Title order={2}>{pendingCount}</Title></Box>
            <IconCloudStorm color="orange" />
          </Group>
        </Card>
        <Card withBorder>
          <Group justify="space-between">
            <Box><Text c="dimmed">Contingencias activas</Text><Title order={2}>{activeCount}</Title></Box>
            <IconShieldCheck color="green" />
          </Group>
        </Card>
      </SimpleGrid>

      <Card withBorder p={0}>
        <Table.ScrollContainer minWidth={980}>
          <Table verticalSpacing="md" horizontalSpacing="md" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fenómeno</Table.Th>
                <Table.Th>Evidencia</Table.Th>
                <Table.Th>Criticidad</Table.Th>
                <Table.Th>Vigencia</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading && <Table.Tr><Table.Td colSpan={6}>Cargando alertas...</Table.Td></Table.Tr>}
              {!loading && alerts.length === 0 && (
                <Table.Tr><Table.Td colSpan={6}>Todavía no se detectaron alertas climáticas.</Table.Td></Table.Tr>
              )}
              {alerts.map((alert) => {
                const displayedCriticality = alert.confirmedCriticality || alert.suggestedCriticality;
                return (
                  <Table.Tr key={alert.id}>
                    <Table.Td fw={600}>{phenomenonLabels[alert.phenomenon]}</Table.Td>
                    <Table.Td>
                      {alert.evidence.maxWindGustKmh !== undefined &&
                        <Text fz="sm">Ráfaga: {alert.evidence.maxWindGustKmh} km/h</Text>}
                      {alert.evidence.accumulatedPrecipitationMm !== undefined &&
                        <Text fz="sm">Precipitación: {alert.evidence.accumulatedPrecipitationMm} mm</Text>}
                      {alert.evidence.temperatureMinC !== undefined &&
                        <Text fz="sm">Temp. mín.: {alert.evidence.temperatureMinC} °C</Text>}
                      {alert.evidence.temperatureMaxC !== undefined &&
                        <Text fz="sm">Temp. máx.: {alert.evidence.temperatureMaxC} °C</Text>}
                      {alert.evidence.provider === 'MANUAL' &&
                        <Text fz="sm">Fuente: {alert.evidence.manual?.source}</Text>}
                      <Text fz="sm">Ubicaciones: {alert.evidence.locations?.length || 1}</Text>
                    </Table.Td>
                    <Table.Td><Badge color={criticalityColors[displayedCriticality]}>{displayedCriticality}</Badge></Table.Td>
                    <Table.Td>
                      <Text size="sm">Desde: {formatDate(alert.validFrom)}</Text>
                      <Text size="sm">Hasta: {formatDate(alert.validUntil)}</Text>
                    </Table.Td>
                    <Table.Td><Badge variant="light">{statusLabels[alert.status]}</Badge></Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="default" onClick={() => setMessageAlert(alert)}>Ver mensaje</Button>
                        {alert.status === 'PENDING' && (
                          <>
                            <Button size="xs" color="green" onClick={() => openConfirm(alert)}>Confirmar</Button>
                            <Button size="xs" color="red" variant="light" onClick={() => openDismiss(alert)}>Descartar</Button>
                          </>
                        )}
                        {alert.status === 'CONFIRMED' && (
                          <Button size="xs" variant="light" loading={submitting} onClick={() => finalize(alert)}>Finalizar</Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Container>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function dateTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function numericValue(value: string | number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function currentActorId(): string {
  try {
    return JSON.parse(localStorage.getItem('auth_user') || 'null')?.id || '(administrador que confirme)';
  } catch {
    return '(administrador que confirme)';
  }
}

function alertMessagePayload(alert: WeatherAlert) {
  return {
    alertaId: alert.id,
    nivelCriticidad: alert.confirmedCriticality || alert.suggestedCriticality,
    fenomeno: alert.phenomenon,
    ubicaciones: (alert.evidence.locations || [{ latitude: alert.latitude, longitude: alert.longitude }])
      .map(({ latitude, longitude }) => ({ latitud: latitude, longitud: longitude })),
    vigenciaDesde: dateTimestamp(alert.validFrom),
    vigenciaHasta: dateTimestamp(alert.validUntil),
    temperaturaMinC: alert.evidence.temperatureMinC ?? null,
    temperaturaMaxC: alert.evidence.temperatureMaxC ?? null,
    actorSub: alert.confirmedBy || currentActorId(),
  };
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
