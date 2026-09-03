import { Alert, Anchor, Box, Button, Divider, Flex, PasswordInput, SimpleGrid, Text, TextInput, Title } from '@mantine/core';
import { IconLogin } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginCulturalEvent from '../assets/login-cultural-event.png';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('ciudadano');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const user = await login(username, password);
      navigate(user.role === 'municipal_admin' ? '/admin' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} mih="100vh" bg="white">
      <Flex align="center" justify="center" px={{ base: 'xl', sm: 56 }} py={48}>
        <Box w="100%" maw={430}>
          <Flex align="center" mb={48}>
            <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', marginRight: 12 }} />
            <Text fw={800} fz="xl">Espacios Públicos</Text>
          </Flex>

          <Title order={1} fz={36} mb="xs">Iniciar sesión</Title>
          <Text c="dimmed" mb={32}>
            Accedé a la agenda cultural y gestioná tus actividades.
          </Text>

          {error && <Alert color="red" mb="lg">{error}</Alert>}

          <form onSubmit={handleLogin}>
            <TextInput
              label="Usuario"
              placeholder="ciudadano o admin"
              required
              size="md"
              value={username}
              onChange={(event) => setUsername(event.currentTarget.value)}
            />
            <PasswordInput
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              size="md"
              mt="lg"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />

            <Button fullWidth mt={28} type="submit" color="dark" size="md" leftSection={<IconLogin size="1.1rem" />} loading={submitting}>
              Ingresar
            </Button>
          </form>

          <Divider my={28} />

          <Flex justify="space-between" align="flex-end" gap="md">
            <Box>
              <Text fw={700} size="sm">Perfiles de prueba</Text>
              <Text size="sm" c="dimmed">ciudadano / 1234</Text>
              <Text size="sm" c="dimmed">admin / 1234</Text>
            </Box>
            <Anchor size="sm" component="button" onClick={() => navigate('/register')}>
              Crear cuenta
            </Anchor>
          </Flex>
        </Box>
      </Flex>

      <Box
        visibleFrom="md"
        mih="100vh"
        style={{
          position: 'relative',
          backgroundImage: `linear-gradient(180deg, rgba(0,10,36,0.02), rgba(0,10,36,0.68)), url(${loginCulturalEvent})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Box style={{ position: 'absolute', left: 48, right: 48, bottom: 48 }}>
          <Text c="white" fw={800} fz={32}>La cultura conecta la ciudad</Text>
          <Text c="rgba(255,255,255,0.86)" fz="lg" mt="xs" maw={540}>
            Música, ciencia, arte y encuentros comunitarios en espacios de todos los barrios.
          </Text>
        </Box>
      </Box>
    </SimpleGrid>
  );
}
