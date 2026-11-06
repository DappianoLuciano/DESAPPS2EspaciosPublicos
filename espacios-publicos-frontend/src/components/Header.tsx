import { Avatar, Burger, Flex, Text } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { describeSession } from '../lib/citypassAuth';

interface HeaderProps {
  mobileOpened: boolean;
  toggleMobile: () => void;
}

export default function Header({ mobileOpened, toggleMobile }: HeaderProps) {
  const location = useLocation();
  const { user } = useAuth();
  const session = user ? describeSession(user) : null;
  const isAdmin = user?.role === 'municipal_admin' && location.pathname.startsWith('/admin');

  return (
    <Flex
      h={64}
      bg="white"
      align="center"
      justify="space-between"
      px={{ base: 'md', sm: 40 }}
      style={{ borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
    >
      <Flex align="center" gap="sm">
        <Burger
          opened={mobileOpened}
          onClick={toggleMobile}
          hiddenFrom="sm"
          size="sm"
          aria-label={mobileOpened ? 'Cerrar menú' : 'Abrir menú'}
        />
        <Text fw={700} fz={{ base: 'md', sm: 'xl' }}>
          {isAdmin ? 'Gestión Municipal' : 'Agenda cultural'}
        </Text>
      </Flex>

      <Flex align="center" gap="md">
        {session && (
          <Text size="xs" c="dimmed" visibleFrom="md">
            uid: {session.uid} · ou: {session.ou} · rol: {session.role}
          </Text>
        )}
        <Text size="sm" fw={600} visibleFrom="xs">{user?.name}</Text>
        <Flex align="center">
          <Avatar src={null} alt={user?.name || 'User'} radius="xl" color="blue">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
          </Avatar>
        </Flex>
      </Flex>
    </Flex>
  );
}
