import { Avatar, Box, Button, Group, Popover, SimpleGrid, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconBrandGoogle, IconBuildingCommunity, IconCalendarEvent, IconCheck, IconChevronDown, IconCopy, IconId, IconLogout, IconSettings, IconShield, IconUser } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../lib/api';
import styles from './AccountMenu.module.css';

export default function AccountMenu({ user, provider, uid = user.id, organization, onLogout }: {
  user: User; provider: 'citypass' | 'google' | 'local'; uid?: string; organization?: string; onLogout: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const admin = user.role === 'municipal_admin';
  const initials = user.name.trim().split(/[\s-]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const ProviderIcon = provider === 'google' ? IconBrandGoogle : provider === 'citypass' ? IconBuildingCommunity : IconUser;
  const providerLabel = provider === 'google' ? 'Cuenta de Google' : provider === 'citypass' ? 'Cuenta CityPass' : 'Cuenta local';
  const copy = async () => {
    try { await navigator.clipboard.writeText(uid); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  };
  return <Popover position="bottom-end" width={360} shadow="md" withinPortal opened={opened} onChange={setOpened}>
    <Popover.Target><UnstyledButton className={styles.trigger} aria-label={`Abrir cuenta de ${user.name}`} aria-expanded={opened}
      onClick={() => { setOpened(value => !value); setCopied(false); setCopyError(false); }}>
      <Text className={styles.name} size="sm" fw={600}>{user.name}</Text>
      <Avatar color="blue" radius="xl" size={38} aria-hidden="true">{initials || 'US'}</Avatar><IconChevronDown size={14} aria-hidden="true" />
    </UnstyledButton></Popover.Target>
    <Popover.Dropdown className={styles.dropdown} aria-label={`Cuenta de ${user.name}`}>
      <Group justify="space-between" className={styles.top}>
        <Tooltip label={providerLabel}><Box role="img" aria-label={providerLabel} style={{ display: 'flex', color: 'var(--mantine-color-blue-7)' }}><ProviderIcon size={20} /></Box></Tooltip>
        <Button color="red" variant="subtle" size="compact-xs" leftSection={<IconLogout size={15} />} onClick={() => { setOpened(false); onLogout(); }}>Cerrar sesión</Button>
      </Group>
      <Group className={styles.identity} wrap="nowrap" gap="md">
        <Avatar color="blue" radius="xl" size={60} aria-hidden="true">{initials || 'US'}</Avatar>
        <Box className={styles.text}><Text fw={700} fz={18}>{user.name}</Text>{!admin && <Text size="sm" c="dimmed" mt={3}>{user.email}</Text>}</Box>
      </Group>
      <Box className={styles.details}>
        <Box className={styles.field} mb="sm">
          <div className={styles.label}><IconId size={15} /><Text size="xs">UID</Text></div>
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs"><Text size="sm" fw={600} className={styles.text}>{uid}</Text>
            <Button size="compact-xs" variant="subtle" leftSection={copied ? <IconCheck size={13} /> : <IconCopy size={13} />} onClick={() => { void copy(); }}>{copied ? 'Copiado' : 'Copiar'}</Button>
          </Group>
          {copyError && <Text size="xs" c="red" role="status">No se pudo copiar. Podés seleccionar el UID.</Text>}
        </Box>
        <SimpleGrid cols={2} spacing="sm">
          <Box className={styles.field}><div className={styles.label}><IconBuildingCommunity size={15} /><Text size="xs">Organización (OU)</Text></div><Text size="sm" fw={600}>{organization && organization !== 'sin dato' ? organization : 'No informada'}</Text></Box>
          <Box className={styles.field}><div className={styles.label}><IconShield size={15} /><Text size="xs">Rol</Text></div><Text size="sm" fw={600}>{admin ? 'Administrador' : 'Ciudadano'}</Text></Box>
        </SimpleGrid>
      </Box>
      <Box className={styles.links}>
        {!admin && <UnstyledButton className={styles.link} component={Link} to="/reservations" onClick={() => setOpened(false)}><IconCalendarEvent size={17} />Mis reservas e inscripciones</UnstyledButton>}
        <UnstyledButton className={styles.link} component={Link} to="/profile" onClick={() => setOpened(false)}><IconSettings size={17} />Mi perfil</UnstyledButton>
      </Box>
    </Popover.Dropdown>
  </Popover>;
}
