import { Container, Title, Text, Card, TextInput, Select, Textarea, Button, Flex, SimpleGrid, Box } from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';

export default function CreateEvent() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const isEditMode = Boolean(id);

  // Mock de datos iniciales si estamos en modo edición
  const initialData = isEditMode ? {
    title: 'Festival de Arte Urbano 2024',
    category: 'Arte',
    location: 'Plaza de las Naciones Unidas',
    description: 'Una celebración de la cultura local con artistas en vivo, talleres interactivos y la mejor gastronomía de la ciudad al aire libre.',
    startDate: '2024-10-15',
    endDate: '2024-10-15',
    capacity: 500
  } : {
    title: '',
    category: null,
    location: null,
    description: '',
    startDate: '',
    endDate: '',
    capacity: ''
  };

  return (
    <Container size="md" py={40}>
      <Title order={1} fz={32} mb="xs">
        {isEditMode ? 'Editar Evento' : 'Crear Nuevo Evento'}
      </Title>
      <Text c="dimmed" mb={40}>
        {isEditMode 
          ? 'Modifique los detalles del evento comunitario.' 
          : 'Complete los detalles para registrar un nuevo evento comunitario en el espacio público.'}
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
              defaultValue={initialData.title}
            />

            <SimpleGrid cols={2} mb="lg">
              <Select
                label="Categoría"
                placeholder="Seleccione categoría"
                data={['Música', 'Arte', 'Tecnología', 'Gastronomía', 'Teatro']}
                defaultValue={initialData.category}
                required
              />
              <Select
                label="Espacio Público"
                placeholder="Seleccione ubicación"
                data={['Plaza de las Naciones Unidas', 'Parque Centenario', 'Planetario', 'Reserva Ecológica']}
                defaultValue={initialData.location}
                required
              />
            </SimpleGrid>

            <Textarea
              label="Descripción"
              placeholder="Detalles sobre las actividades, artistas, etc."
              minRows={4}
              required
              mb="lg"
              defaultValue={initialData.description}
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
              defaultValue={initialData.startDate}
            />
            <TextInput
              label="Fecha de Fin"
              type="date"
              mb="md"
              defaultValue={initialData.endDate}
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
              defaultValue={initialData.capacity}
              required
            />
          </Card>
        </Box>
      </SimpleGrid>

      <Flex justify="flex-end" gap="md" mt={40}>
        <Button variant="default" onClick={() => navigate('/admin')}>Cancelar</Button>
        <Button color="blue" onClick={() => navigate('/admin')}>
          {isEditMode ? 'Guardar Cambios' : 'Crear Evento'}
        </Button>
      </Flex>
    </Container>
  );
}
