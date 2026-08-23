import { Container, Card, Title, Text, Button, Center, Box, Flex } from '@mantine/core';
import { IconCheck, IconDownload, IconHome } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function ReservationSuccess() {
  const navigate = useNavigate();

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
        <Title order={2} style={{ fontFamily: 'Space Grotesk' }} fz={32} mb="xs">
          ¡Reserva Confirmada!
        </Title>
        <Text c="dimmed" fz="lg" mb={40}>
          Tu lugar está asegurado. Presenta tu QR en la entrada.
        </Text>

        <Card withBorder shadow="sm" radius="md" w="100%" p={0}>
          <Box p="xl" bg="gray.0" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <Title order={3} fz={20}>Festival Buenos Aires Urbano 2024</Title>
            <Flex mt="md" gap="xl">
              <Box>
                <Text fz="xs" fw={600} c="dimmed" tt="uppercase">Fecha</Text>
                <Text fw={500}>15 Oct 2024</Text>
              </Box>
              <Box>
                <Text fz="xs" fw={600} c="dimmed" tt="uppercase">Horario</Text>
                <Text fw={500}>14:00hs</Text>
              </Box>
              <Box>
                <Text fz="xs" fw={600} c="dimmed" tt="uppercase">Entradas</Text>
                <Text fw={500}>2 Personas</Text>
              </Box>
            </Flex>
          </Box>
          <Center p="xl" style={{ flexDirection: 'column' }}>
            <Box w={180} h={180} bg="gray.2" style={{ backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg)', backgroundSize: 'contain' }} mb="lg" />
            <Badge color="gray" variant="light" size="lg">#RES-2024-8921</Badge>
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

// Just adding a quick Badge import that I missed above
import { Badge } from '@mantine/core';
