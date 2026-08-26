import { Container, Title, Text, Card, SimpleGrid, TextInput, Button, Flex } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';

export default function ProfileSettings() {
  return (
    <Container size="md" py={40}>
      <Title order={1} fz={40} mb="xs">
        Perfil y Ajustes
      </Title>
      <Text c="dimmed" fz="lg" mb={40}>
        Gestiona tu información personal, seguridad y preferencias de notificaciones.
      </Text>

      <Card withBorder shadow="sm" radius="md" p="xl">
        <Flex justify="space-between" align="center" mb="xl" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
          <Title order={2} fz={20}>Datos Personales</Title>
          <Button variant="subtle" size="sm" leftSection={<IconEdit size="1rem" />}>
            Editar
          </Button>
        </Flex>

        <SimpleGrid cols={3} spacing="lg" mb="xl">
          <TextInput
            label="Nombre Completo"
            defaultValue="Ana Luz"
            variant="filled"
            size="md"
            readOnly
          />
          <TextInput
            label="DNI"
            defaultValue="34.567.890"
            variant="filled"
            size="md"
            readOnly
          />
          <TextInput
            label="Comuna"
            defaultValue="Comuna 14 (Palermo)"
            variant="filled"
            size="md"
            readOnly
          />
        </SimpleGrid>

        <SimpleGrid cols={2} spacing="lg" mb="xl">
          <TextInput
            label="Teléfono"
            defaultValue="+54 11 1234-5678"
            variant="filled"
            size="md"
            readOnly
          />
          <TextInput
            label="Correo Electrónico"
            defaultValue="ana.luz@ejemplo.com"
            variant="filled"
            size="md"
            readOnly
          />
        </SimpleGrid>

        <Flex justify="flex-end" gap="md" mt={40} pt={24} style={{ borderTop: '1px solid #E2E8F0' }}>
          <Button variant="default" size="md">Descartar</Button>
          <Button size="md" color="blue">Guardar Cambios</Button>
        </Flex>
      </Card>
    </Container>
  );
}
