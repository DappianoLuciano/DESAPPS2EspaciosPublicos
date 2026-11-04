import { Box, Card, SimpleGrid, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEmergencyImpacts } from '../lib/api';
import type { EmergencyImpactSummary } from '../lib/api';

/** Va al final de cada pantalla de administracion. Si no hay datos no muestra nada. */
export default function ModuleDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'municipal_admin';
  const [summary, setSummary] = useState<EmergencyImpactSummary | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    getEmergencyImpacts()
      .then((response) => setSummary(response.summary))
      .catch(() => setSummary(null));
  }, [isAdmin]);

  if (!isAdmin || !summary) {
    return null;
  }

  const stats = [
    { label: 'Reservas', value: summary.reservations },
    { label: 'Reservas afectadas', value: summary.affectedBookings },
    { label: 'Espacios liberados', value: summary.releasedSpaces },
    { label: 'Problemáticas', value: summary.problems },
  ];

  return (
    <Box px={{ base: 'md', sm: 40 }} py="lg">
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {stats.map((stat) => (
          <Card key={stat.label} withBorder padding="sm">
            <Text size="xs" c="dimmed">{stat.label}</Text>
            <Text fw={700} fz="xl">{stat.value}</Text>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );
}
