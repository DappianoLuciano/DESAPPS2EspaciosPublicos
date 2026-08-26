import { Container, Title, Text, Card, Flex, Button, Box, ActionIcon, Select, Textarea, Alert, ThemeIcon } from '@mantine/core';
import { IconArrowLeft, IconAlertTriangle, IconArmchair } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function CancelReservation() {
  const navigate = useNavigate();
  const { id: _id } = useParams(); // Podríamos usar el id para buscar el evento real, por ahora usamos datos de prueba

  return (
    <Container size="sm" py={40}>
      <Card withBorder shadow="sm" radius="md" p={0}>
        <Box p="xl" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <Flex align="center" gap="md">
            <ActionIcon variant="subtle" color="gray" onClick={() => navigate(-1)}>
              <IconArrowLeft size="1.2rem" />
            </ActionIcon>
            <Title order={2} fz={24}>Cancelar Reserva</Title>
          </Flex>
        </Box>

        <Box p="xl">
          <Card withBorder bg="gray.0" radius="md" p="md" mb="xl">
            <Flex gap="md" align="center">
              <ThemeIcon size="xl" color="gray" variant="light" radius="md">
                <IconArmchair size="1.5rem" />
              </ThemeIcon>
              <Box>
                <Text fw={700} tt="uppercase" fz="sm">Festival de Jazz BA</Text>
                <Text size="sm" c="dimmed">Sáb 15 Oct, 20:00 hs</Text>
                <Text size="sm" c="dimmed">2 Entradas Generales</Text>
              </Box>
            </Flex>
          </Card>

          <Alert 
            icon={<IconAlertTriangle size="1.2rem" />} 
            title="Liberación de cupo" 
            color="red" 
            variant="light" 
            mb="xl"
            styles={{ title: { fontWeight: 700 } }}
          >
            Al confirmar la cancelación, tus lugares serán liberados inmediatamente para que otros ciudadanos puedan asistir. Esta acción no se puede deshacer.
          </Alert>

          <Select
            label="Motivo de cancelación"
            placeholder="Seleccioná un motivo..."
            data={['Problemas personales', 'Enfermedad', 'Tope de horario', 'Otro']}
            required
            mb="xl"
            withAsterisk
          />

          <Textarea
            label="Comentarios adicionales (opcional)"
            placeholder="Contanos más detalles si lo deseás..."
            minRows={4}
            mb="xl"
          />
        </Box>

        <Box p="xl" bg="gray.0" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Flex justify="flex-end" gap="md">
            <Button variant="default" onClick={() => navigate(-1)}>
              Mantener Reserva
            </Button>
            <Button color="red" onClick={() => navigate('/reservations')}>
              Confirmar Cancelación
            </Button>
          </Flex>
        </Box>
      </Card>
    </Container>
  );
}
