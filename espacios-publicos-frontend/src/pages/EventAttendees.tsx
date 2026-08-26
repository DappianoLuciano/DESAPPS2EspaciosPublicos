import { Container, Title, Text, Card, Flex, Button, Box, Table, TextInput, Pagination, Center, Avatar, Anchor, Progress } from '@mantine/core';
import { IconArrowLeft, IconPrinter, IconDownload, IconSearch, IconUsersGroup } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function EventAttendees() {
  const navigate = useNavigate();

  const attendees = [
    { id: 1, name: 'Mariana Rodríguez', comuna: 'Comuna 14', dni: '32.456.789', email: 'm.rodriguez@email.com', phone: '+54 11 4567-8901', date: '12 Oct 2023', time: '14:30 hs' },
    { id: 2, name: 'Lucas Gómez', comuna: 'Comuna 3', dni: '28.123.456', email: 'lucas.gomez@email.com', phone: '+54 11 2345-6789', date: '14 Oct 2023', time: '09:15 hs' },
    { id: 3, name: 'Valentina Costa', comuna: 'Comuna 2', dni: '35.987.654', email: 'val.costa@email.com', phone: '+54 11 9876-5432', date: '15 Oct 2023', time: '11:45 hs' },
  ];

  return (
    <Container size="xl" py={40}>
      <Anchor 
        component="button" 
        onClick={() => navigate('/admin')} 
        c="dimmed" 
        size="sm" 
        mb="md"
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <IconArrowLeft size="1rem" /> Volver al evento
      </Anchor>

      <Flex justify="space-between" align="flex-start" mb={40}>
        <Box>
          <Title order={1} fz={32} mb={4}>Gestión de Inscriptos</Title>
          <Text c="dimmed" size="lg">Festival de Innovación Urbana 2024</Text>
        </Box>
        <Flex gap="sm">
          <Button variant="default" leftSection={<IconPrinter size="1rem" />}>Imprimir</Button>
          <Button color="dark" leftSection={<IconDownload size="1rem" />}>Descargar CSV</Button>
        </Flex>
      </Flex>

      <Center mb={40}>
        <Card withBorder shadow="sm" radius="md" p="xl" w={320}>
          <Flex align="center" gap="xs" mb="sm" c="dimmed">
            <IconUsersGroup size="1.2rem" />
            <Text fw={700} size="xs" tt="uppercase">TOTAL INSCRIPTOS</Text>
          </Flex>
          <Flex align="baseline" gap="xs" mb="lg">
            <Title order={2} fz={40}>342</Title>
            <Text c="dimmed">/ 500 cupos</Text>
          </Flex>
          <Progress value={(342 / 500) * 100} color="dark" size="md" radius="xl" />
        </Card>
      </Center>

      <Card withBorder shadow="sm" radius="md" p={0}>
        <Box p="md" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <TextInput
            placeholder="Buscar por nombre, DNI o email..."
            leftSection={<IconSearch size="1rem" />}
            variant="default"
            w={{ base: '100%', sm: 320 }}
          />
        </Box>

        <Table verticalSpacing="md" horizontalSpacing="lg" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>CIUDADANO</Table.Th>
              <Table.Th>DNI</Table.Th>
              <Table.Th>CONTACTO</Table.Th>
              <Table.Th>FECHA REGISTRO</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {attendees.map((person) => (
              <Table.Tr key={person.id}>
                <Table.Td>
                  <Flex align="center" gap="sm">
                    <Avatar color="blue" radius="xl">{person.name.split(' ').map(n => n[0]).join('')}</Avatar>
                    <Box>
                      <Text fw={600} size="sm">{person.name}</Text>
                      <Text size="xs" c="dimmed">{person.comuna}</Text>
                    </Box>
                  </Flex>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{person.dni}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{person.email}</Text>
                  <Text size="xs" c="dimmed">{person.phone}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{person.date}</Text>
                  <Text size="xs" c="dimmed">{person.time}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Flex justify="space-between" align="center" p="md" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Text size="sm" c="dimmed">Mostrando 1 a 3 de 342 inscritos</Text>
          <Pagination total={12} value={1} size="sm" />
        </Flex>
      </Card>
    </Container>
  );
}
