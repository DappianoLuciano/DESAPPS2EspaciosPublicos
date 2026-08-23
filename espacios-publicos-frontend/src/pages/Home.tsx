import { Box, Container, Title, Text, SimpleGrid, Card, Badge, ActionIcon, Flex, Button } from '@mantine/core';
import { IconMusic, IconMicrophone2, IconPalette, IconDeviceGamepad, IconBookmark } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const categories = [
    { label: 'Música', icon: IconMusic, color: 'blue', bg: 'rgba(164, 201, 255, 0.2)' },
    { label: 'Arte', icon: IconPalette, color: 'green', bg: 'rgba(178, 240, 211, 0.4)' },
    { label: 'Charlas', icon: IconMicrophone2, color: 'indigo', bg: 'rgba(217, 226, 255, 0.5)' },
    { label: 'Juegos', icon: IconDeviceGamepad, color: 'red', bg: 'rgba(255, 218, 214, 0.5)' },
  ];

  const events = [
    {
      id: 1,
      tag: 'MÚSICA LIBRE',
      title: 'Jazz en el Parque Centenario',
      desc: 'Disfruta de una tarde de jazz contemporáneo al aire libre...',
      date: '15 Oct, 18:00hs',
    },
    {
      id: 2,
      tag: 'TECNOLOGÍA',
      title: 'BA Tech Summit 2024',
      desc: 'El encuentro más grande de innovación y tecnología...',
      date: '20 Oct, 09:00hs',
    },
    {
      id: 3,
      tag: 'GASTRONOMÍA',
      title: 'Festival Sabores BA',
      desc: 'Descubrí la diversidad culinaria de la ciudad con más de 50...',
      date: '25 Oct, 12:00hs',
    }
  ];

  return (
    <Container size="lg" py={40}>
      <Box
        h={350}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(0deg, rgba(0, 10, 36, 0.9) 0%, rgba(0, 10, 36, 0.5) 50%, rgba(0, 10, 36, 0) 100%), url(https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80) center/cover',
          position: 'relative',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <Badge color="green" variant="filled" size="lg" radius="xl" mb="md" style={{ width: 'fit-content', color: '#002116', backgroundColor: '#B2F0D3' }}>
          DESTACADO
        </Badge>
        <Title order={1} c="white" style={{ fontFamily: 'Space Grotesk' }} fz={40} mb="sm">
          Noche de los Museos 2026
        </Title>
        <Text c="rgba(255,255,255,0.9)" fz="lg" maw={600} mb="xl">
          Explora el arte y la cultura de la ciudad en una noche inolvidable. Cientos de museos e instituciones abren sus puertas con actividades especiales gratuitas.
        </Text>
      </Box>

      <Flex justify="space-between" align="center" mt={48} mb={24}>
        <Title order={2} style={{ fontFamily: 'Space Grotesk' }}>Categorías</Title>
        <Button variant="subtle" size="xs">Ver todas</Button>
      </Flex>

      <SimpleGrid cols={4} spacing="lg">
        {categories.map((cat) => (
          <Card key={cat.label} shadow="sm" padding="xl" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box bg={cat.bg} p={16} style={{ borderRadius: '50%' }} mb="md">
              <cat.icon size="1.5rem" color={`var(--mantine-color-${cat.color}-filled)`} />
            </Box>
            <Text fw={600} fz="xl" style={{ fontFamily: 'Space Grotesk' }}>{cat.label}</Text>
          </Card>
        ))}
      </SimpleGrid>

      <Title order={2} style={{ fontFamily: 'Space Grotesk' }} mt={48} mb={24}>
        Próximos Eventos
      </Title>

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
            <Text fw={600} fz="xl" mt="xs" style={{ fontFamily: 'Space Grotesk' }}>{ev.title}</Text>
            <Text fz="sm" c="dimmed" mt="sm" lineClamp={2}>
              {ev.desc}
            </Text>

            <Badge variant="light" color="gray" mt="lg" fullWidth size="lg" radius="sm">
              {ev.date}
            </Badge>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
