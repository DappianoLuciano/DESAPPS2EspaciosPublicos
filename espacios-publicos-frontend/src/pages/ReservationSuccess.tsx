import { Badge, Box, Button, Card, Center, Container, Flex, Text, Title } from '@mantine/core';
import { IconCheck, IconDownload, IconHome } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CommunityEventCatalogItem } from '../lib/api';

export default function ReservationSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const event = location.state?.event as CommunityEventCatalogItem | undefined;

  const formatDate = (date?: string) => {
    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const formatTime = (date?: string) => {
    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <Container size="sm" py={60}>
      <Center style={{ flexDirection: 'column' }}>
        <Box
          bg="#B2F0D3"
          w={80}
          h={80}
          style={{ borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          mb="xl"
        >
          <IconCheck size="2.5rem" color="#0F503C" stroke={3} />
        </Box>
        <Title order={2} fz={32} mb="xs">
          ¡Reserva Confirmada!
        </Title>
        <Text c="dimmed" fz="lg" mb={40}>
          Tu lugar está asegurado. Presenta tu QR en la entrada.
        </Text>

        <Card withBorder shadow="sm" radius="md" w="100%" p={0}>
          <Box p="xl" bg="gray.0" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <Title order={3} fz={20}>{event?.title || 'Evento reservado'}</Title>
            <Flex mt="md" gap="xl">
              <Box>
                <Text fz="xs" fw={600} c="dimmed" tt="uppercase">Fecha</Text>
                <Text fw={500}>{formatDate(event?.startDate)}</Text>
              </Box>
              <Box>
                <Text fz="xs" fw={600} c="dimmed" tt="uppercase">Horario</Text>
                <Text fw={500}>{formatTime(event?.startDate)}</Text>
              </Box>
              <Box>
                <Text fz="xs" fw={600} c="dimmed" tt="uppercase">Entradas</Text>
                <Text fw={500}>1 Persona</Text>
              </Box>
            </Flex>
          </Box>
          <Center p="xl" style={{ flexDirection: 'column' }}>
            <Box w={180} h={180} bg="gray.2" style={{ backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg)', backgroundSize: 'contain' }} mb="lg" />
            <Badge color="gray" variant="light" size="lg">#{event?.id.slice(0, 8).toUpperCase() || 'RESERVA'}</Badge>
          </Center>
        </Card>

        <Flex direction="column" gap="md" w="100%" mt={40}>
          <Button size="lg" leftSection={<IconDownload size="1.2rem" />} fullWidth>
            Descargar Entrada
          </Button>
          <Button size="lg" variant="default" leftSection={<IconHome size="1.2rem" />} fullWidth onClick={() => navigate('/')}>
            Volver al Inicio
          </Button>
        </Flex>
      </Center>
    </Container>
  );
}
