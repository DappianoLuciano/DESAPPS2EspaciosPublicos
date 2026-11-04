import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconMapPin,
  IconRefresh,
  IconRoute,
  IconTruck,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  completeTowService,
  listTowInterventions,
  requestTow,
} from '../lib/api';
import type { TowIntervention, TowInterventionStatus } from '../lib/api';

const statusConfig: Record<
  TowInterventionStatus,
  { label: string; color: string }
> = {
  PENDING: { label: 'Pendiente de grúa', color: 'orange' },
  TOW_REQUESTED: { label: 'Grúa solicitada', color: 'blue' },
  COMPLETED: { label: 'Resuelto', color: 'green' },
};

type StatusFilter = TowInterventionStatus | 'ALL';

export default function TowInterventionManagement() {
  const [interventions, setInterventions] = useState<TowIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selected, setSelected] = useState<TowIntervention | null>(null);
  const [action, setAction] = useState<'request' | 'complete' | null>(null);
  const [patente, setPatente] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadInterventions = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setInterventions(await listTowInterventions());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las intervenciones.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInterventions();
  }, [loadInterventions]);

  const counts = useMemo(
    () => ({
      total: interventions.length,
      pending: interventions.filter((item) => item.status === 'PENDING').length,
      requested: interventions.filter((item) => item.status === 'TOW_REQUESTED').length,
      completed: interventions.filter((item) => item.status === 'COMPLETED').length,
    }),
    [interventions]
  );

  const visibleInterventions = useMemo(() => {
    const filtered =
      statusFilter === 'ALL'
        ? interventions
        : interventions.filter((item) => item.status === statusFilter);

    return [...filtered].sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  }, [interventions, statusFilter]);

  const openRequest = (intervention: TowIntervention) => {
    setSelected(intervention);
    setPatente('');
    setError(null);
    setAction('request');
  };

  const openComplete = (intervention: TowIntervention) => {
    setSelected(intervention);
    setError(null);
    setAction('complete');
  };

  const closeModal = () => {
    if (submitting) return;
    setAction(null);
    setSelected(null);
    setPatente('');
  };

  const submitRequest = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await requestTow(selected.id, patente);
      setNotice(`La grúa fue solicitada para el vehículo ${normalizePlate(patente)}.`);
      closeAfterSuccess();
      await loadInterventions(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo solicitar la grúa.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitComplete = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await completeTowService(selected.id);
      setNotice('El servicio fue finalizado y la intervención quedó resuelta.');
      closeAfterSuccess();
      await loadInterventions(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo finalizar el servicio.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeAfterSuccess = () => {
    setAction(null);
    setSelected(null);
    setPatente('');
  };

  return (
    <Container size="xl" py={{ base: 24, sm: 40 }}>
      <Modal
        opened={action === 'request'}
        onClose={closeModal}
        title="Solicitar grúa"
        centered
      >
        <Stack gap="md">
          <Alert color="blue" icon={<IconTruck size={18} />}>
            Se registrará la hora de solicitud para el reclamo{' '}
            <strong>{selected?.reclamoId}</strong>.
          </Alert>
          <TextInput
            label="Patente del vehículo"
            description="Podés escribirla con o sin espacios o guiones."
            placeholder="AB123CD"
            value={patente}
            onChange={(event) => setPatente(event.currentTarget.value.toUpperCase())}
            maxLength={16}
            autoFocus
            required
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              color="blue"
              leftSection={<IconTruck size={17} />}
              onClick={submitRequest}
              loading={submitting}
              disabled={!normalizePlate(patente)}
            >
              Solicitar grúa
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={action === 'complete'}
        onClose={closeModal}
        title="Finalizar servicio de grúa"
        centered
      >
        <Stack gap="md">
          <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
            Confirmá esta acción únicamente cuando la grúa haya retirado el vehículo{' '}
            <strong>{selected?.patente}</strong>.
          </Alert>
          <Text size="sm" c="dimmed">
            Al confirmar se registrará la hora de resolución. La publicación del evento
            hacia Reclamos se habilitará en la etapa de integración.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal} disabled={submitting}>
              Volver
            </Button>
            <Button
              color="green"
              leftSection={<IconCheck size={17} />}
              onClick={submitComplete}
              loading={submitting}
            >
              Confirmar retiro
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Group gap="sm" mb={6}>
            <ThemeIcon size={42} radius="md" color="blue" variant="light">
              <IconTruck size={24} />
            </ThemeIcon>
            <Title order={1} fz={{ base: 26, sm: 34 }}>
              Gestión de grúas
            </Title>
          </Group>
          <Text c="dimmed" maw={680}>
            Seguimiento administrativo de las obstrucciones evaluadas por Movilidad.
            Solicitá la grúa y confirmá manualmente el retiro del vehículo.
          </Text>
        </Box>
        <Button
          variant="light"
          leftSection={<IconRefresh size={18} />}
          loading={refreshing}
          onClick={() => void loadInterventions(true)}
        >
          Actualizar
        </Button>
      </Group>

      {notice && (
        <Alert color="green" icon={<IconCheck size={18} />} mb="lg" withCloseButton onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />} mb="lg" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        <SummaryCard label="Total" value={counts.total} color="gray" />
        <SummaryCard label="Pendientes" value={counts.pending} color="orange" />
        <SummaryCard label="Solicitadas" value={counts.requested} color="blue" />
        <SummaryCard label="Resueltas" value={counts.completed} color="green" />
      </SimpleGrid>

      <Card withBorder radius="lg" p="lg" mb="lg">
        <Group justify="space-between">
          <Box>
            <Text fw={700}>Intervenciones</Text>
            <Text size="sm" c="dimmed">
              Los casos más recientemente actualizados aparecen primero.
            </Text>
          </Box>
          <Select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(value) => setStatusFilter((value || 'ALL') as StatusFilter)}
            data={[
              { value: 'ALL', label: 'Todos los estados' },
              { value: 'PENDING', label: 'Pendientes de grúa' },
              { value: 'TOW_REQUESTED', label: 'Grúa solicitada' },
              { value: 'COMPLETED', label: 'Resueltos' },
            ]}
            w={{ base: '100%', sm: 220 }}
          />
        </Group>
      </Card>

      {loading ? (
        <Group justify="center" py={80}>
          <Loader />
          <Text c="dimmed">Cargando intervenciones…</Text>
        </Group>
      ) : visibleInterventions.length === 0 ? (
        <Card withBorder radius="lg" p={40}>
          <Stack align="center" gap="xs">
            <ThemeIcon size={54} radius="xl" color="gray" variant="light">
              <IconTruck size={28} />
            </ThemeIcon>
            <Text fw={700}>No hay intervenciones para mostrar</Text>
            <Text size="sm" c="dimmed" ta="center">
              Cuando llegue una evaluación de Movilidad aparecerá en este listado.
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="md">
          {visibleInterventions.map((intervention) => (
            <InterventionCard
              key={intervention.id}
              intervention={intervention}
              onRequest={() => openRequest(intervention)}
              onComplete={() => openComplete(intervention)}
            />
          ))}
        </Stack>
      )}
    </Container>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card withBorder radius="lg" p="lg">
      <Text size="sm" c="dimmed" fw={600}>{label}</Text>
      <Text fz={30} fw={800} c={`${color}.7`}>{value}</Text>
    </Card>
  );
}

function InterventionCard({
  intervention,
  onRequest,
  onComplete,
}: {
  intervention: TowIntervention;
  onRequest: () => void;
  onComplete: () => void;
}) {
  const status = statusConfig[intervention.status];

  return (
    <Card withBorder radius="lg" p={{ base: 'md', sm: 'xl' }}>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Box>
          <Group gap="sm" mb={5}>
            <Badge color={status.color} variant="light">{status.label}</Badge>
            <Badge color={intervention.requiereGrua ? 'violet' : 'gray'} variant="outline">
              {intervention.requiereGrua ? 'Requiere grúa' : 'Sin grúa'}
            </Badge>
          </Group>
          <Text fw={800} fz="lg">{intervention.direccion}</Text>
          <Text size="sm" c="dimmed">Reclamo {intervention.reclamoId}</Text>
        </Box>

        {intervention.status === 'PENDING' && intervention.requiereGrua && (
          <Button leftSection={<IconTruck size={18} />} onClick={onRequest}>
            Solicitar grúa
          </Button>
        )}
        {intervention.status === 'TOW_REQUESTED' && (
          <Button color="green" leftSection={<IconCheck size={18} />} onClick={onComplete}>
            Finalizar servicio
          </Button>
        )}
      </Group>

      <Divider my="lg" />

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Detail icon={<IconMapPin size={17} />} label="Ubicación" value={intervention.barrio} />
        <Detail icon={<IconRoute size={17} />} label="Impacto" value={intervention.impactoCirculacion} />
        <Detail
          icon={<IconClock size={17} />}
          label="Evaluado"
          value={formatDate(intervention.evaluadoAt)}
        />
        <Detail
          icon={<IconTruck size={17} />}
          label="Vehículo"
          value={intervention.patente || 'No informado'}
        />
      </SimpleGrid>

      {(intervention.solicitadoAt || intervention.resueltoAt) && (
        <Group gap="xl" mt="lg" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          {intervention.solicitadoAt && (
            <Text size="sm"><strong>Grúa solicitada:</strong> {formatDate(intervention.solicitadoAt)}</Text>
          )}
          {intervention.resueltoAt && (
            <Text size="sm" c="green.8"><strong>Resuelto:</strong> {formatDate(intervention.resueltoAt)}</Text>
          )}
        </Group>
      )}
    </Card>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <ThemeIcon color="gray" variant="light" size="sm">{icon}</ThemeIcon>
      <Box>
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">{label}</Text>
        <Text size="sm" fw={600}>{value}</Text>
      </Box>
    </Group>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function normalizePlate(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]/g, '');
}
