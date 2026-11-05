import { Alert, Badge, Box, Button, Card, Checkbox, Group, Loader, Modal, Stack, Text, Textarea } from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { applyWeatherRestrictions, finalizeWeatherAlert, getWeatherImpact, releaseWeatherRestrictions } from '../lib/api';
import type { WeatherAlert, WeatherImpactPlan } from '../lib/api';
import { formatWeatherDate, weatherPhenomenonLabels } from '../lib/weatherAlertPresentation';

export default function WeatherMeasuresButton({ alert, onUpdated, finish = false }: {
  alert: WeatherAlert; onUpdated?: () => void; finish?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [plan, setPlan] = useState<WeatherImpactPlan | null>(null);
  const [spaceIds, setSpaceIds] = useState<string[]>([]);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const load = () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    return getWeatherImpact(alert.id, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setPlan(result);
      setSpaceIds(result.spaces.filter(space => !space.restricted).map(space => space.id));
      setEventIds(result.spaces.flatMap(space => space.events.filter(event => event.selectable && !event.restricted).map(event => event.id)));
    }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'No se pudo consultar el impacto.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  };

  const open = () => {
    setOpened(true); setPlan(null); setError(null); setNotice(null);
    setReason(`Suspendido por alerta climática: ${weatherPhenomenonLabels[alert.phenomenon]}.`);
    void load();
  };
  const close = () => { if (!saving) { request.current?.abort(); setOpened(false); } };
  const toggle = (ids: string[], id: string, checked: boolean) => checked ? [...new Set([...ids, id])] : ids.filter(value => value !== id);
  const apply = async () => {
    setSaving(true); setError(null);
    try {
      setPlan(await applyWeatherRestrictions(alert.id, { spaceIds, eventIds, reason }));
      setSpaceIds([]); setEventIds([]);
      setNotice('Medidas aplicadas. Los espacios quedan restringidos en este período y los eventos seleccionados, suspendidos.');
      onUpdated?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron aplicar las medidas.'); }
    finally { setSaving(false); }
  };
  const finishAndRelease = async () => {
    if (!plan) return;
    setSaving(true); setError(null);
    try {
      if (plan.status === 'CONFIRMED') {
        await finalizeWeatherAlert(alert.id);
        // Si el segundo paso falla, el modal permite reintentar solo el levantamiento.
        setPlan(current => current ? { ...current, status: 'FINALIZED', canApply: false } : current);
      }
      setPlan(await releaseWeatherRestrictions(alert.id));
      setNotice('Alerta finalizada y medidas levantadas. Se conservaron cancelaciones definitivas y restricciones de otras causas.');
      onUpdated?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo completar el cierre. Podés reintentar.'); }
    finally { setSaving(false); }
  };
  const applied = (plan?.activeSpaceCount || 0) + (plan?.activeEventCount || 0);
  const showFinish = finish || plan?.status === 'FINALIZED';

  return (
    <>
      <Button size="xs" variant={finish ? 'light' : 'filled'} color={finish ? 'gray' : 'blue'} onClick={open}
        leftSection={finish ? undefined : <IconShieldCheck size={15} />}>
        {finish ? 'Finalizar' : alert.status === 'FINALIZED' ? 'Revisar medidas pendientes' : 'Gestionar espacios y eventos'}
      </Button>
      <Modal opened={opened} onClose={close} closeOnClickOutside={!saving} closeOnEscape={!saving}
        title={showFinish ? 'Finalizar alerta y revisar medidas' : 'Restringir espacios y suspender eventos'} size="lg" centered>
        <Stack gap="md">
          <Text fw={600}>{weatherPhenomenonLabels[alert.phenomenon]}</Text>
          <Text size="sm">{formatWeatherDate(plan?.validFrom || alert.validFrom)} → {formatWeatherDate(plan?.validUntil || alert.validUntil)} · Buenos Aires</Text>
          {error && <Alert color="red">{error}</Alert>}
          {notice && <Alert color="green">{notice}</Alert>}
          {loading && <Group><Loader size="sm" /><Text size="sm">Buscando espacios y actividades…</Text></Group>}
          {!loading && !plan && <Button variant="light" onClick={() => { setError(null); void load(); }}>Reintentar consulta</Button>}
          {!loading && plan && <>
            {applied > 0 && <Alert color="blue" title="Medidas vinculadas a esta alerta">
              <Text size="sm">{plan.activeSpaceCount} espacios restringidos · {plan.activeEventCount} eventos vinculados.</Text>
              <Text size="xs" mt={4}>{[...plan.appliedSpaces.map(space => space.name), ...plan.appliedEvents.map(event => event.title)].join(' · ')}</Text>
            </Alert>}
            {showFinish ? <>
              <Text size="sm">Al confirmar, se levantan únicamente las restricciones de esta alerta y se reanudan sus eventos futuros, salvo que estén cancelados o afectados por otra alerta. No se eliminan suspensiones manuales ni cierres administrativos.</Text>
              <Group justify="flex-end"><Button variant="default" onClick={close} disabled={saving}>Volver</Button>
                {(plan.status === 'CONFIRMED' || applied > 0) && <Button color="blue" loading={saving} onClick={finishAndRelease}>
                  {plan.status === 'FINALIZED' ? 'Levantar medidas de esta alerta' : applied ? 'Finalizar y levantar medidas' : 'Finalizar alerta'}
                </Button>}
              </Group>
            </> : <>
              <Text size="sm" c="dimmed">Revisá la selección y confirmá una vez. Los espacios bloquean nuevas reservas y nuevos eventos solo en este período. Las actividades seleccionadas conservan sus inscriptos. No se cancelan reservas existentes ni se envían correos desde esta acción.</Text>
              <Text size="xs" c="dimmed">Alcance propuesto: barrios que contienen los puntos de la alerta ({plan.neighborhoods.join(', ') || 'sin barrios calculados'}), espacios exteriores o mixtos y horarios superpuestos. No representa toda la extensión del fenómeno.</Text>
              {!plan.canApply && <Alert color="yellow">Esta alerta ya no admite nuevas medidas. Podés finalizarla para revisar el levantamiento de las existentes.</Alert>}
              {!plan.spaces.length && <Alert color="gray">No se encontraron espacios compatibles. Revisá sus coordenadas o barrio y su exposición climática. No se aplicarán restricciones a toda CABA por defecto.</Alert>}
              <Stack gap="sm" mah="28vh" style={{ overflowY: 'auto' }} aria-label="Selección de espacios y eventos">
              {plan.spaces.map(space => <Card key={space.id} withBorder radius="md" p="md" style={{ flexShrink: 0 }}>
                <Checkbox label={space.name} description={`${space.zone || 'Barrio sin definir'} · ${space.exposure === 'OUTDOOR' ? 'Exterior' : 'Mixto'} · Restringir nuevas reservas`}
                  checked={space.restricted || spaceIds.includes(space.id)} disabled={space.restricted || !plan.canApply || saving}
                  onChange={event => { const checked = event.currentTarget.checked; setSpaceIds(ids => toggle(ids, space.id, checked)); }} />
                {space.restricted && <Badge size="xs" mt="xs" variant="light">Restricción aplicada</Badge>}
                <Stack gap="sm" mt="md" pl="md" style={{ borderLeft: '2px solid var(--mantine-color-gray-2)' }}>
                  {!space.events.length && <Text size="xs" c="dimmed">Sin eventos futuros superpuestos.</Text>}
                  {space.events.map(event => <Box key={event.id}><Checkbox label={event.title}
                    description={`${formatWeatherDate(event.startDate)} · ${event.restricted ? 'Medida aplicada' : !event.selectable ? 'Suspensión manual: se conserva' : 'Suspender actividad'}`}
                    checked={event.restricted || eventIds.includes(event.id)} disabled={event.restricted || !event.selectable || !plan.canApply || saving}
                    onChange={input => { const checked = input.currentTarget.checked; setEventIds(ids => toggle(ids, event.id, checked)); }} /></Box>)}
                </Stack>
              </Card>)}
              </Stack>
              {plan.canApply && <Textarea label="Motivo visible para los ciudadanos" value={reason} required maxLength={500}
                disabled={saving} onChange={event => setReason(event.currentTarget.value)} autosize minRows={2} />}
              <Group justify="space-between" align="center" bg="white" py="xs" style={{ position: 'sticky', bottom: 0, zIndex: 1 }}>
                <Text size="sm">{spaceIds.length} espacios · {eventIds.length} eventos nuevos</Text>
                <Button loading={saving} disabled={!plan.canApply || !reason.trim() || (!spaceIds.length && !eventIds.length)} onClick={apply}>Aplicar medidas</Button>
              </Group>
              {applied > 0 && <Button variant="subtle" color="gray" loading={saving} onClick={finishAndRelease}>Finalizar alerta y levantar sus medidas</Button>}
            </>}
          </>}
        </Stack>
      </Modal>
    </>
  );
}
