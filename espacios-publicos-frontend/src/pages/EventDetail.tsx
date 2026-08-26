import { Box, Container, Title, Text, SimpleGrid, Card, Badge, Group, Button, Flex, List, ThemeIcon } from '@mantine/core';
import { IconCheck, IconMapPin, IconCalendar, IconClock, IconUsers } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function EventDetail() {
  const navigate = useNavigate();

  return (
    <Container size="xl" py={40}>
      <SimpleGrid cols={12} spacing="xl">
        <Box style={{ gridColumn: 'span 4' }}>
          <Box
            h={350}
            style={{
              borderRadius: 16,
              background: 'url(https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?auto=format&fit=crop&q=80) center/cover',
              position: 'relative'
            }}
          >
            <Badge color="green" variant="filled" size="lg" radius="xl" m="md" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
              ENTRADA GRATUITA
            </Badge>
          </Box>

          <Card shadow="sm" padding="xl" radius="md" withBorder mt="lg">
            <Title order={3} fz={24}>Entrada Gratuita</Title>
            <Text c="dimmed" fz="sm" mt="xs">Requiere inscripción previa</Text>
            
            <List spacing="sm" size="sm" mt="xl" icon={<ThemeIcon color="blue" size={20} radius="xl"><IconCheck size="0.8rem" /></ThemeIcon>}>
              <List.Item>Cupos limitados</List.Item>
              <List.Item>Se solicitará QR al ingreso</List.Item>
            </List>

            <Button fullWidth size="lg" mt="xl" color="blue" onClick={() => navigate('/reservation-success')}>
              Reservar Lugar
            </Button>
          </Card>
        </Box>

        <Box style={{ gridColumn: 'span 8' }}>
          <Title order={1} fz={36}>Festival de Arte Urbano 2024</Title>
          <Text fz="lg" c="dimmed" mt="md" maw={600}>
            Una celebración de la cultura local con artistas en vivo, talleres interactivos y la mejor gastronomía de la ciudad al aire libre.
          </Text>

          <Flex gap="md" mt="xl">
            <Card withBorder radius="md" p="md" bg="gray.0" style={{ flex: 1 }}>
              <Group>
                <ThemeIcon color="gray" variant="light" size="lg" radius="md"><IconCalendar size="1.2rem" /></ThemeIcon>
                <div>
                  <Text fz="xs" c="dimmed" fw={600} tt="uppercase">Fecha</Text>
                  <Text fw={700}>15 de Octubre</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder radius="md" p="md" bg="gray.0" style={{ flex: 1 }}>
              <Group>
                <ThemeIcon color="gray" variant="light" size="lg" radius="md"><IconClock size="1.2rem" /></ThemeIcon>
                <div>
                  <Text fz="xs" c="dimmed" fw={600} tt="uppercase">Horario</Text>
                  <Text fw={700}>14:00 - 22:00hs</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder radius="md" p="md" bg="gray.0" style={{ flex: 1 }}>
              <Group>
                <ThemeIcon color="gray" variant="light" size="lg" radius="md"><IconUsers size="1.2rem" /></ThemeIcon>
                <div>
                  <Text fz="xs" c="dimmed" fw={600} tt="uppercase">Público</Text>
                  <Text fw={700}>Familiar</Text>
                </div>
              </Group>
            </Card>
          </Flex>

          <Title order={3} mt={40} mb="md">Acerca del Evento</Title>
          <Text c="dimmed" lh={1.6}>
            El Festival de Arte Urbano 2024 reúne a los mejores exponentes locales para una jornada dedicada a la creatividad y la expresión ciudadana. Disfrutá de murales en vivo, instalaciones interactivas y presentaciones musicales en un entorno seguro y familiar.
          </Text>
          <Text c="dimmed" lh={1.6} mt="md">
            Este año, el foco está puesto en la sustentabilidad y el cuidado del espacio público, con talleres especiales de reciclaje artístico y charlas sobre el impacto del arte en la comunidad.
          </Text>

          <Card withBorder bg="gray.0" mt={40} p="xl" radius="md">
            <Title order={4} mb="md">Requisitos e Información</Title>
            <List spacing="md" icon={<ThemeIcon color="green" size={24} radius="xl"><IconCheck size="1rem" /></ThemeIcon>}>
              <List.Item>Llevar DNI o documento de identidad</List.Item>
              <List.Item>Presentar QR de reserva en el acceso</List.Item>
              <List.Item>Prohibido el ingreso con bebidas alcohólicas</List.Item>
            </List>
          </Card>

          <Title order={3} mt={40} mb="md">Ubicación</Title>
          <Card withBorder radius="md" p={0} h={250} style={{ overflow: 'hidden', position: 'relative' }}>
            <Box h="100%" bg="gray.2" style={{ background: 'url(https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80) center/cover' }} />
            <Card shadow="sm" p="sm" radius="md" style={{ position: 'absolute', bottom: 16, left: 16 }}>
              <Group gap="xs">
                <IconMapPin size="1rem" color="gray" />
                <Text fw={700} fz="sm">Plaza de las Naciones Unidas</Text>
              </Group>
            </Card>
          </Card>
        </Box>
      </SimpleGrid>
    </Container>
  );
}
