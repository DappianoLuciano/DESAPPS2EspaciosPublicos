import { Alert, Badge, Box, Button, Checkbox, Collapse, Group, Loader, Modal, Stack, Text, Textarea } from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { applyWeatherRestrictions, finalizeWeatherAlert, getWeatherImpact, releaseWeatherRestrictions } from '../lib/api';
import type { WeatherAlert, WeatherImpactPlan } from '../lib/api';
import { formatWeatherDate, weatherPhenomenonLabels } from '../lib/weatherAlertPresentation';
import styles from './WeatherMeasuresButton.module.css';

const countLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

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
  const [editingReason, setEditingReason] = useState(false);
  const [showApplied, setShowApplied] = useState(false);
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
    setEditingReason(false); setShowApplied(false);
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
      setEditingReason(false);
      setNotice('Medidas aplicadas correctamente.');
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
        title={showFinish ? 'Finalizar alerta y revisar medidas' : 'Aplicar medidas climáticas'} size="lg" centered
        classNames={{ title: styles.title, body: styles.body }} closeButtonProps={{ 'aria-label': 'Cerrar gestión de medidas' }}>
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={600}>{weatherPhenomenonLabels[alert.phenomenon]}</Text>
            <Text size="xs" c="dimmed" mt={3}>{formatWeatherDate(plan?.validFrom || alert.validFrom)} → {formatWeatherDate(plan?.validUntil || alert.validUntil)} · Buenos Aires</Text>
          </Box>
          {error && <Alert color="red">{error}</Alert>}
          {notice && <Alert color="green">{notice}</Alert>}
          {loading && <Group><Loader size="sm" /><Text size="sm">Buscando espacios y actividades…</Text></Group>}
          {!loading && !plan && <Button variant="light" onClick={() => { setError(null); void load(); }}>Reintentar consulta</Button>}
          {!loading && plan && <>
            {applied > 0 && <Box className={styles.applied}>
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Text size="sm">{countLabel(plan.activeSpaceCount, 'espacio', 'espacios')} · {countLabel(plan.activeEventCount, 'evento', 'eventos')} con medidas aplicadas</Text>
                <Button size="compact-xs" variant="subtle" onClick={() => setShowApplied(value => !value)} aria-expanded={showApplied}>{showApplied ? 'Ocultar' : 'Ver'}</Button>
              </Group>
              <Collapse expanded={showApplied}><Text size="xs" mt="xs">{[...plan.appliedSpaces.map(space => space.name), ...plan.appliedEvents.map(event => event.title)].join(' · ')}</Text></Collapse>
            </Box>}
            {showFinish ? <>
              <Text size="sm">{plan.status === 'FINALIZED' && !applied ? 'No quedan medidas pendientes de esta alerta.' : 'El cierre levanta solo las medidas de esta alerta y reanuda sus eventos cuando corresponde. Se conservan cancelaciones, suspensiones manuales y otros bloqueos.'}</Text>
              <Group justify="flex-end"><Button variant="default" onClick={close} disabled={saving}>Volver</Button>
                {(plan.status === 'CONFIRMED' || applied > 0) && <Button color="blue" loading={saving} onClick={finishAndRelease}>
                  {plan.status === 'FINALIZED' ? 'Levantar medidas de esta alerta' : applied ? 'Finalizar y levantar medidas' : 'Finalizar alerta'}
                </Button>}
              </Group>
            </> : <>
              <details className={styles.details}>
                <summary>Alcance y condiciones</summary>
                <Text size="xs" mt="xs">Los espacios seleccionados bloquean nuevas reservas y eventos durante la vigencia. Las actividades seleccionadas se suspenden y conservan sus inscriptos. No se cancelan reservas existentes ni se envían correos.</Text>
                <Text size="xs" mt={6}>Barrios de referencia: {plan.neighborhoods.join(', ') || 'sin barrios calculados'}. Solo espacios exteriores o mixtos y actividades con horarios superpuestos. Los puntos no representan toda la extensión del fenómeno.</Text>
              </details>
              {!plan.canApply && <Alert color="yellow">Esta alerta ya no admite nuevas medidas. Podés finalizarla para revisar el levantamiento de las existentes.</Alert>}
              {!plan.spaces.length && <Alert color="gray">Sin espacios compatibles. Revisá ubicación y exposición climática.</Alert>}
              <Stack gap={0} className={styles.selection} aria-label="Selección de espacios y eventos">
              {plan.spaces.map(space => <Box key={space.id} className={styles.space}>
                <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                <Checkbox className={styles.checkbox} label={space.name} description={`${space.zone || 'Barrio sin definir'} · ${space.exposure === 'OUTDOOR' ? 'Exterior' : 'Mixto'}`}
                  checked={space.restricted || spaceIds.includes(space.id)} disabled={space.restricted || !plan.canApply || saving}
                  onChange={event => { const checked = event.currentTarget.checked; setSpaceIds(ids => toggle(ids, space.id, checked)); }} />
                {space.restricted ? <Badge className={styles.appliedBadge} size="xs" radius="sm" variant="light">Aplicada</Badge> : <Text size="xs" c="dimmed" className={styles.hint}>Restringir reservas y eventos</Text>}
                </Group>
                {!!space.events.length && <Stack gap="sm" mt="sm" className={styles.events}>
                  {space.events.map(event => <Group key={event.id} justify="space-between" align="flex-start" wrap="nowrap" gap="xs"><Checkbox className={styles.checkbox} label={event.title}
                    description={`${formatWeatherDate(event.startDate)}${!event.restricted && !event.selectable ? ' · Suspensión manual' : ''}`}
                    checked={event.restricted || eventIds.includes(event.id)} disabled={event.restricted || !event.selectable || !plan.canApply || saving}
                    onChange={input => { const checked = input.currentTarget.checked; setEventIds(ids => toggle(ids, event.id, checked)); }} />
                    {event.restricted ? <Badge className={styles.appliedBadge} size="xs" radius="sm" variant="light">Aplicada</Badge> : event.selectable && <Text size="xs" c="dimmed" className={styles.hint}>Suspender</Text>}
                  </Group>)}
                </Stack>}
                {!space.events.length && <Text size="xs" c="dimmed" mt={6} ml={32}>Sin eventos superpuestos</Text>}
              </Box>)}
              </Stack>
              {plan.canApply && <Box className={styles.reason}>
                <Group justify="space-between" gap="xs" mb={6}>
                  <Text size="xs" fw={600} c="dimmed">Motivo visible para ciudadanos</Text>
                  <Button size="compact-xs" variant="subtle" disabled={saving} onClick={() => setEditingReason(value => !value)} aria-expanded={editingReason}>{editingReason ? 'Listo' : 'Editar'}</Button>
                </Group>
                {editingReason ? <Textarea aria-label="Motivo visible para los ciudadanos" value={reason} required maxLength={500}
                  disabled={saving} onChange={event => setReason(event.currentTarget.value)} autosize minRows={2} /> : <Text size="sm" style={{ overflowWrap: 'anywhere' }}>{reason || 'Indicá un motivo para aplicar medidas.'}</Text>}
              </Box>}
              <Group justify="space-between" align="center" className={styles.footer}>
                <Text size="sm" c="dimmed">{spaceIds.length + eventIds.length ? `${countLabel(spaceIds.length, 'espacio', 'espacios')} · ${countLabel(eventIds.length, 'evento', 'eventos')} por aplicar` : 'Sin nuevas medidas seleccionadas'}</Text>
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
