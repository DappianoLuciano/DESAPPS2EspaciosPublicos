import { Container, Title, Text, Card, TextInput, Select, Textarea, Button, Flex, SimpleGrid, Box } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export default function CreateEvent() {
  const navigate = useNavigate();

  return (
    <Container size="md" py={40}>
      <Title order={1} fz={32} mb="xs">
        Crear Nuevo Evento
      </Title>
      <Text c="dimmed" mb={40}>
        Complete los detalles para registrar un nuevo evento comunitario en el espacio público.
      </Text>

      <SimpleGrid cols={12} spacing="xl">
        <Box style={{ gridColumn: 'span 8' }}>
          <Card withBorder shadow="sm" radius="md" p="xl">
            <Title order={3} fz={20} mb="xl" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              Detalles Generales
            </Title>
            
            <TextInput
              label="Título del Evento"
              placeholder="Ej: Festival de Arte Urbano"
              required
              mb="lg"
            />

            <SimpleGrid cols={2} mb="lg">
              <Select
                label="Categoría"
                placeholder="Seleccione categoría"
                data={['Música', 'Arte', 'Tecnología', 'Gastronomía', 'Teatro']}
                required
              />
              <Select
                label="Espacio Público"
                placeholder="Seleccione ubicación"
                data={['Plaza de las Naciones Unidas', 'Parque Centenario', 'Planetario', 'Reserva Ecológica']}
                required
              />
            </SimpleGrid>

            <Textarea
              label="Descripción"
              placeholder="Detalles sobre las actividades, artistas, etc."
              minRows={4}
              required
              mb="lg"
            />
          </Card>
        </Box>

        <Box style={{ gridColumn: 'span 4' }}>
          <Card withBorder shadow="sm" radius="md" p="xl" mb="xl">
            <Title order={3} fz={20} mb="xl" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              Fechas
            </Title>
            
            <TextInput
              label="Fecha de Inicio"
              type="date"
              required
              mb="md"
            />
            <TextInput
              label="Fecha de Fin"
              type="date"
              mb="md"
            />
          </Card>

          <Card withBorder shadow="sm" radius="md" p="xl">
            <Title order={3} fz={20} mb="xl" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              Aforo
            </Title>
            
            <TextInput
              label="Capacidad Máxima"
              type="number"
              placeholder="Ej: 500"
              required
            />
          </Card>
        </Box>
      </SimpleGrid>

      <Flex justify="flex-end" gap="md" mt={40}>
        <Button variant="default" onClick={() => navigate('/admin')}>Cancelar</Button>
        <Button color="blue" onClick={() => navigate('/admin')}>Crear Evento</Button>
      </Flex>
    </Container>
  );
}
