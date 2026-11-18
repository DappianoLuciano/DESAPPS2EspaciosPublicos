import { ActionIcon, Badge, Box, Button, Card, Group, Select, Stack, Table, Tabs, Text, TextInput, Tooltip } from '@mantine/core';
import { IconBan, IconCheck, IconEdit, IconMapPin, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react';
import { useEffect, useId, useState } from 'react';
import type { PublicSpace } from '../lib/api';
import { PUBLIC_SPACE_CATEGORY_LABELS } from '../lib/api';
import { exposureLabels, filterPublicSpaces, spaceStatusLabels, spaceWeatherState } from '../lib/publicSpaceList';
import type { SpaceStatusFilter } from '../lib/publicSpaceList';
import { formatWeatherDate } from '../lib/weatherAlertPresentation';
import styles from './PublicSpacesTable.module.css';

export default function PublicSpacesTable({ spaces, loading, onEdit, onToggle, onDelete, onRefresh }: {
  spaces: PublicSpace[]; loading: boolean; onEdit: (space: PublicSpace) => void;
  onToggle: (space: PublicSpace) => void; onDelete: (space: PublicSpace) => void; onRefresh: () => void;
}) {
  const categoryId = useId(), exposureId = useId();
  const [status, setStatus] = useState<SpaceStatusFilter>('ALL');
  const [search, setSearch] = useState(''), [category, setCategory] = useState('ALL'), [exposure, setExposure] = useState('ALL');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  const { counts, items } = filterPublicSpaces(spaces, { status, search, category, exposure }, now);
  return <Box>
    <div className={styles.filters}>
      <Tabs value={status} onChange={value => setStatus((value || 'ALL') as SpaceStatusFilter)} variant="pills" className={styles.tabs}>
        <Tabs.List className={styles.tabsList} aria-label="Filtrar espacios por estado">
          {(Object.keys(spaceStatusLabels) as SpaceStatusFilter[]).map(value => <Tabs.Tab className={styles.tab} value={value} key={value}
            rightSection={<Badge size="sm" circle color={value === 'RESTRICTED' ? 'orange' : 'gray'}>{counts[value]}</Badge>}>{spaceStatusLabels[value]}</Tabs.Tab>)}
        </Tabs.List>
      </Tabs>
      <Stack gap={3} className={styles.filterSelect}><Text component="label" htmlFor={categoryId} size="xs" c="dimmed">Categoría</Text>
        <Select id={categoryId} className={styles.select} value={category} allowDeselect={false} onChange={value => setCategory(value || 'ALL')}
          data={[{ value: 'ALL', label: 'Todas' }, ...Object.entries(PUBLIC_SPACE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })), { value: 'NONE', label: 'Sin categoría' }]} />
      </Stack>
      <Stack gap={3} className={styles.filterSelect}><Text component="label" htmlFor={exposureId} size="xs" c="dimmed">Exposición</Text>
        <Select id={exposureId} className={styles.select} value={exposure} allowDeselect={false} onChange={value => setExposure(value || 'ALL')}
          data={[{ value: 'ALL', label: 'Todas' }, ...Object.entries(exposureLabels).map(([value, label]) => ({ value, label }))]} />
      </Stack>
    </div>
    <Group justify="space-between" gap="sm" mb="md">
      <TextInput className={styles.search} aria-label="Buscar espacios" placeholder="Buscar nombre, dirección o barrio" value={search} onChange={event => setSearch(event.currentTarget.value)} leftSection={<IconSearch size={16} />} />
      <Group gap="xs"><Text size="xs" c="dimmed" role="status">{items.length} de {spaces.length} espacios</Text>
        {(status !== 'ALL' || search || category !== 'ALL' || exposure !== 'ALL') && <Button size="compact-xs" variant="subtle" onClick={() => { setStatus('ALL'); setSearch(''); setCategory('ALL'); setExposure('ALL'); }}>Limpiar filtros</Button>}
        <Tooltip label="Actualizar espacios y restricciones"><ActionIcon variant="subtle" aria-label="Actualizar espacios y restricciones" loading={loading} onClick={onRefresh}><IconRefresh size={18} /></ActionIcon></Tooltip>
      </Group>
    </Group>
    <Text hiddenFrom="sm" size="xs" c="dimmed" mb="xs">Deslizá la tabla para ver todas las columnas.</Text>
    <Card withBorder radius="md" p={0}>
      <Table.ScrollContainer minWidth={1080}>
        <Table className={styles.table} verticalSpacing="md" horizontalSpacing="md" highlightOnHover>
          <colgroup>{[23, 18, 8, 18, 9, 10, 14].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
          <Table.Thead><Table.Tr>{['Espacio', 'Ubicación', 'Capacidad', 'Estado', 'Categoría', 'Exposición', 'Acciones'].map(label => <Table.Th key={label}>{label}</Table.Th>)}</Table.Tr></Table.Thead>
          <Table.Tbody>
            {loading && !spaces.length && <Table.Tr><Table.Td colSpan={7}>Cargando espacios…</Table.Td></Table.Tr>}
            {!loading && !items.length && <Table.Tr><Table.Td colSpan={7}>{spaces.length ? 'No hay espacios para estos filtros.' : 'Todavía no hay espacios públicos cargados.'}</Table.Td></Table.Tr>}
            {items.map(space => {
              const weather = spaceWeatherState(space, now);
              const disabled = space.status === 'DISABLED';
              const periods = [...weather.active, ...weather.upcoming];
              return <Table.Tr key={space.id} className={disabled ? styles.disabled : undefined}>
                <Table.Td><div className={styles.name}><IconMapPin className={styles.pin} size={18} /><Text size="sm" fw={600}>{space.name}</Text></div></Table.Td>
                <Table.Td><Text size="sm">{space.address}</Text><Text size="xs" c="dimmed" mt={3}>{space.zone || 'Barrio sin definir'}</Text>
                  {(space.latitude == null || space.longitude == null) && <Badge color="orange" variant="light" size="xs" mt={4}>Sin ubicación</Badge>}
                </Table.Td>
                <Table.Td><Text size="sm">{space.capacity.toLocaleString('es-AR')}</Text></Table.Td>
                <Table.Td><Stack gap={5} align="flex-start">
                  <Badge className={styles.badge} variant="light" color={disabled ? 'gray' : weather.active.length ? 'orange' : 'green'}>{disabled ? 'Deshabilitado' : weather.active.length ? 'Restringido por clima' : 'Habilitado'}</Badge>
                  {!disabled && weather.active.length > 0 && <Text size="xs" c="dimmed">Estado general habilitado</Text>}
                  {periods.length > 0 && <Tooltip multiline w={300} label={periods.map(period => `${formatWeatherDate(period.validFrom)} → ${formatWeatherDate(period.validUntil)}`).join(' · ')}>
                    <Text size="xs" c={weather.active.length ? 'orange.8' : 'blue.8'} tabIndex={0}>{weather.active.length ? 'Restricción temporal vigente' : 'Restricción climática programada'}</Text>
                  </Tooltip>}
                </Stack></Table.Td>
                <Table.Td><Text size="sm">{space.category ? PUBLIC_SPACE_CATEGORY_LABELS[space.category] : 'Sin categoría'}</Text></Table.Td>
                <Table.Td><Text size="sm">{space.exposure ? exposureLabels[space.exposure] : 'Sin definir'}</Text></Table.Td>
                <Table.Td><div className={styles.actions}>
                  <Tooltip label="Editar"><ActionIcon variant="subtle" size="lg" aria-label={`Editar ${space.name}`} onClick={() => onEdit(space)}><IconEdit size={18} /></ActionIcon></Tooltip>
                  <Tooltip label={disabled ? 'Habilitar estado general' : 'Deshabilitar estado general'}><ActionIcon variant="subtle" size="lg" color={disabled ? 'green' : 'red'} aria-label={`${disabled ? 'Habilitar' : 'Deshabilitar'} ${space.name}`} onClick={() => onToggle(space)}>{disabled ? <IconCheck size={18} /> : <IconBan size={18} />}</ActionIcon></Tooltip>
                  <Tooltip label="Eliminar"><ActionIcon variant="subtle" color="red" size="lg" aria-label={`Eliminar ${space.name}`} onClick={() => onDelete(space)}><IconTrash size={18} /></ActionIcon></Tooltip>
                </div></Table.Td>
              </Table.Tr>;
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
    <Text size="xs" c="dimmed" mt="xs">Las restricciones climáticas son temporales y no cambian el estado general. Habilitar el espacio no levanta esas medidas.</Text>
  </Box>;
}
