import { Alert, Badge, Box, Button, Group, Modal, SegmentedControl, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { finishIntervention, listPendingInterventions } from '../lib/api';
import type { InterventionResult, PendingIntervention } from '../lib/api';

const formatDate = (date: string) => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(date));

const RESULT_HELP: Record<InterventionResult, string> = {
  RESUELTO: 'Intervinimos en la calle y el problema se solucionó. Reclamos marca el reclamo como resuelto.',
  RECHAZADO: 'No hizo falta intervenir (por ejemplo, no hacía falta grúa). Reclamos lo cierra como rechazado, no como resuelto.',
};

export default function Interventions() {
  const [items, setItems] = useState<PendingIntervention[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [closing, setClosing] = useState<PendingIntervention | null>(null);
  const [result, setResult] = useState<InterventionResult>('RESUELTO');
  const [plate, setPlate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    listPendingInterventions()
      .then((response) => {
        setItems(response);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const closeModal = () => {
    setClosing(null);
    setResult('RESUELTO');
    setPlate('');
  };

  const confirm = async () => {
    if (!closing) return;
    setSaving(true);

    try {
      await finishIntervention(closing.reclamoId, result, plate.trim() || undefined);
      setNotice(`Intervención del reclamo ${closing.reclamoId} cerrada como ${result === 'RESUELTO' ? 'resuelta' : 'no necesaria'}. Se avisó a Reclamos.`);
      closeModal();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la intervención.');
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={{ base: 'md', sm: 40 }}>
      <Title order={1} fz={32}>Intervenciones</Title>
      <Text c="dimmed" mt="xs" mb="lg">
        Reclamos que cortan la circulación y esperan una intervención de Espacios en la calle. Al cerrarla se le avisa a Reclamos para que cierre el reclamo del vecino.
      </Text>

      {error && <Alert color="red" mb="md" withCloseButton onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert color="green" mb="md" withCloseButton onClose={() => setNotice(null)}>{notice}</Alert>}

      {items && items.length === 0 && (
        <Alert color="gray">No hay intervenciones pendientes.</Alert>
      )}

      {items && items.length > 0 && (
        <Table.ScrollContainer minWidth={640}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Reclamo</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Barrio</Table.Th>
                <Table.Th>Recibido</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.reclamoId}>
                  <Table.Td><Text ff="monospace" fz="sm">{item.reclamoId}</Text></Table.Td>
                  <Table.Td>{item.category ? <Badge variant="light">{item.category.replace(/_/g, ' ')}</Badge> : '-'}</Table.Td>
                  <Table.Td>{item.zone || '-'}</Table.Td>
                  <Table.Td>{formatDate(item.reportedAt)}</Table.Td>
                  <Table.Td>
                    <Button size="xs" onClick={() => setClosing(item)}>Cerrar intervención</Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal opened={closing !== null} onClose={closeModal} title="Cerrar intervención" centered>
        <Stack>
          <Text fz="sm">Reclamo <Text span ff="monospace">{closing?.reclamoId}</Text></Text>
          <SegmentedControl
            fullWidth
            value={result}
            onChange={(value) => setResult(value as InterventionResult)}
            data={[
              { value: 'RESUELTO', label: 'Resuelto' },
              { value: 'RECHAZADO', label: 'No hizo falta intervenir' },
            ]}
          />
          <Text fz="sm" c="dimmed">{RESULT_HELP[result]}</Text>
          {result === 'RESUELTO' && (
            <TextInput
              label="Patente del vehículo (opcional)"
              placeholder="AB123CD"
              maxLength={20}
              value={plate}
              onChange={(event) => setPlate(event.currentTarget.value)}
            />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal} disabled={saving}>Volver</Button>
            <Button onClick={confirm} loading={saving}>Confirmar</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
