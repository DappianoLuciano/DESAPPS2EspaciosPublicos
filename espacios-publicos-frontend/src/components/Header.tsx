import { Flex, TextInput, Avatar, Text, ActionIcon } from '@mantine/core';
import { IconSearch, IconBell, IconMapPin } from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' && location.pathname.startsWith('/admin');

  return (
    <Flex
      h={64}
      bg="white"
      align="center"
      justify="space-between"
      px={40}
      style={{ borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
    >
      <Flex align="center" gap="md">
        {isAdmin ? (
          <Text fw={700} fz="xl">Gestión Municipal</Text>
        ) : (
          <TextInput
            placeholder="Buscar eventos..."
            leftSection={<IconSearch size="0.9rem" />}
            radius="xl"
            variant="filled"
            w={256}
          />
        )}
      </Flex>

      <Flex align="center" gap="lg">
        {!isAdmin && (
          <Flex align="center" gap="xs">
            <Text fw={700} fz="lg">Argentina</Text>
            <ActionIcon variant="transparent" color="gray">
              <IconMapPin size="1.2rem" />
            </ActionIcon>
          </Flex>
        )}
        
        <Flex align="center" gap="md" style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 16 }}>
          <ActionIcon variant="light" color="gray" radius="xl" size="lg">
            <IconBell size="1.2rem" />
          </ActionIcon>
          <Avatar src={null} alt={user?.name || 'User'} radius="xl" color="blue">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
          </Avatar>
        </Flex>
      </Flex>
    </Flex>
  );
}
