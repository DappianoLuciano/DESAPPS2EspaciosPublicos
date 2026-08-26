import { Container, Title, Text, SimpleGrid, Card, Badge, ActionIcon, Box, Flex } from '@mantine/core';
import { IconBookmark, IconArrowLeft } from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';

export default function CategoryEvents() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Diccionario para mostrar el nombre bonito de la categoría
  const categoryNames: Record<string, string> = {
    musica: 'Música',
    arte: 'Arte',
    charlas: 'Charlas',
    juegos: 'Juegos'
  };

  const categoryName = id ? categoryNames[id] || 'Eventos' : 'Eventos';

  // Lista mock de eventos filtrados (simulada)
  const events = [
    {
      id: 1,
      tag: 'MÚSICA LIBRE',
      title: 'Jazz en el Parque Centenario',
      desc: 'Disfruta de una tarde de jazz contemporáneo al aire libre...',
      date: '15 Oct, 18:00hs',
    },
    {
      id: 4,
      tag: 'CONCIERTO',
      title: 'Orquesta Sinfónica en Vivo',
      desc: 'Presentación especial de la Orquesta Municipal tocando clásicos.',
      date: '18 Oct, 20:00hs',
    },
    {
      id: 5,
      tag: 'FESTIVAL',
      title: 'Bandas Locales BA',
      desc: 'El festival que reúne a las mejores bandas emergentes de la ciudad.',
      date: '22 Oct, 16:00hs',
    }
  ];

  return (
    <Container size="lg" py={40}>
      <Flex align="center" gap="md" mb={40}>
        <ActionIcon variant="light" size="xl" radius="md" onClick={() => navigate('/')}>
          <IconArrowLeft size="1.5rem" />
        </ActionIcon>
        <Box>
          <Title order={1} fz={32}>
            Eventos de {categoryName}
          </Title>
          <Text c="dimmed">
            Explora todas las actividades disponibles en esta categoría.
          </Text>
        </Box>
      </Flex>

      <SimpleGrid cols={3} spacing="lg">
        {events.map((ev) => (
          <Card key={ev.id} shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => navigate(`/event/${ev.id}`)}>
            <Card.Section>
              <Box h={160} bg="gray.2" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?auto=format&fit=crop&q=80)', backgroundSize: 'cover' }}>
                <ActionIcon variant="default" radius="md" size="lg" style={{ position: 'absolute', top: 16, right: 16 }}>
                  <IconBookmark size="1.1rem" color="gray" />
                </ActionIcon>
              </Box>
            </Card.Section>

            <Text c="dimmed" fz="xs" fw={700} mt="md" tt="uppercase">{ev.tag}</Text>
            <Text fw={600} fz="xl" mt="xs">{ev.title}</Text>
            <Text fz="sm" c="dimmed" mt="sm" lineClamp={2}>
              {ev.desc}
            </Text>

            <Badge variant="light" color="gray" mt="lg" fullWidth size="lg" radius="sm">
              {ev.date}
            </Badge>
          </Card>
        ))}
      </SimpleGrid>

      {events.length === 0 && (
        <Text ta="center" c="dimmed" mt={40}>No hay eventos disponibles en esta categoría.</Text>
      )}
    </Container>
  );
}
