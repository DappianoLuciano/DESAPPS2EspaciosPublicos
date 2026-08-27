import { Box, NavLink, Flex, Text, Avatar } from '@mantine/core';
import { IconHome, IconCalendarEvent, IconSettings, IconPlus, IconDashboard, IconLogout, IconMapPin } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const mainLinks = [
    { icon: IconHome, label: 'Home', path: '/' },
    { icon: IconCalendarEvent, label: 'Mis Reservas', path: '/reservations' },
  ];

  const adminLinks = [
    { icon: IconDashboard, label: 'Panel Admin', path: '/admin' },
    { icon: IconPlus, label: 'Nuevo Evento', path: '/admin/create-event' },
    { icon: IconCalendarEvent, label: 'Gestión de Eventos', path: '/admin/events' },
    { icon: IconMapPin, label: 'Espacios Públicos', path: '/admin/public-spaces' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box w={280} h="100vh" bg="#000A24" c="white" style={{ borderRight: '1px solid #C5C6CE', display: 'flex', flexDirection: 'column' }}>
      <Flex p="lg" align="center" gap="md" style={{ borderBottom: '1px solid rgba(197, 198, 206, 0.2)' }}>
        <Avatar src="https://flagcdn.com/w40/ar.png" radius="xl" size="sm" />
        <Text fw={700} fz="xl">Espacios Publicos</Text>
      </Flex>

      <Box style={{ flex: 1, padding: '16px 0' }}>
        {user?.role !== 'municipal_admin' && mainLinks.map((link) => (
          <NavLink
            key={link.label}
            label={<Text fw={600} fz="sm">{link.label}</Text>}
            leftSection={<link.icon size="1.2rem" stroke={1.5} />}
            active={location.pathname === link.path}
            onClick={() => navigate(link.path)}
            color="white"
            variant="filled"
            style={{
              color: location.pathname === link.path ? 'white' : 'rgba(255,255,255,0.7)',
              backgroundColor: location.pathname === link.path ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderRadius: '0 8px 8px 0',
              marginBottom: 4,
            }}
          />
        ))}

        {user?.role === 'municipal_admin' && (
          <>
            <Text c="dimmed" fz="xs" fw={700} tt="uppercase" px="lg" mt="xl" mb="sm">Admin</Text>
            {adminLinks.map((link) => (
              <NavLink
                key={link.label}
                label={<Text fw={600} fz="sm">{link.label}</Text>}
                leftSection={<link.icon size="1.2rem" stroke={1.5} />}
                active={location.pathname === link.path}
                onClick={() => navigate(link.path)}
                color="white"
                variant="filled"
                style={{
                  color: location.pathname === link.path ? 'white' : 'rgba(255,255,255,0.7)',
                  backgroundColor: location.pathname === link.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderRadius: '0 8px 8px 0',
                  marginBottom: 4,
                }}
              />
            ))}
          </>
        )}
      </Box>

      <Box style={{ borderTop: '1px solid rgba(197, 198, 206, 0.2)', padding: '16px 0' }}>
        <NavLink
          label={<Text fw={600} fz="sm">Ajustes</Text>}
          leftSection={<IconSettings size="1.2rem" stroke={1.5} />}
          onClick={() => navigate('/profile')}
          active={location.pathname === '/profile'}
          style={{
            color: location.pathname === '/profile' ? 'white' : 'rgba(255,255,255,0.7)',
            backgroundColor: location.pathname === '/profile' ? 'rgba(255,255,255,0.1)' : 'transparent',
          }}
        />
        <NavLink
          label={<Text fw={600} fz="sm" c="red.4">Cerrar Sesión</Text>}
          leftSection={<IconLogout size="1.2rem" stroke={1.5} color="var(--mantine-color-red-4)" />}
          onClick={handleLogout}
        />
      </Box>
    </Box>
  );
}
