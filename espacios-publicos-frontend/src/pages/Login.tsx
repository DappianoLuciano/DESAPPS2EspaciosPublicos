import { Alert, Anchor, Box, Button, Divider, Flex, PasswordInput, SimpleGrid, Text, TextInput, Title } from '@mantine/core';
import { IconLogin } from '@tabler/icons-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginCulturalEvent from '../assets/login-cultural-event.png';
import { useAuth } from '../context/AuthContext';
import { isMockLoginEnabled } from '../lib/api';

export default function Login() {
  const isDemoMode = isMockLoginEnabled;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, loginWithGoogle, loginWithCityPass } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const user = await loginWithCityPass(username, password);
      navigate(user.role === 'municipal_admin' ? '/admin' : '/');
    } catch (err) {
      if (isDemoMode && (username === 'admin' || username === 'ciudadano') && password === '1234') {
        try {
          const demoUser = await login(username, password);
          navigate(demoUser.role === 'municipal_admin' ? '/admin' : '/');
          return;
        } catch {
          // Si el mock también falla, mantener el error original
        }
      }
      setError(err instanceof Error ? err.message : 'Usuario o contraseña incorrectos.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('No se pudo completar el inicio de sesión con Google.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const user = await loginWithGoogle(credentialResponse.credential);
      navigate(user.role === 'municipal_admin' ? '/admin' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} mih="100vh" bg="white">
      <Flex align="center" justify="center" px={{ base: 'xl', sm: 56 }} py={48}>
        <Box w="100%" maw={430}>
          <Flex align="center" mb={36}>
            <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', marginRight: 12 }} />
            <Text fw={800} fz="xl">Espacios Públicos</Text>
          </Flex>

          <Title order={1} fz={32} mb="xs">
            Iniciar sesión
          </Title>
          <Text c="dimmed" mb={24} fz="sm">
            Accedé a los servicios del módulo de Espacios Públicos y Cultura.
          </Text>

          {error && <Alert color="red" mb="lg">{error}</Alert>}

          <Box mb={24}>
            <Text fw={600} fz="sm" mb={4}>Acceso Ciudadano</Text>
            <Text c="dimmed" fz="xs" mb="sm">
              Iniciá sesión con tu cuenta de Google para inscribirte a eventos y solicitar espacios.
            </Text>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('No se pudo completar el inicio de sesión con Google.')}
              text="signin_with"
              width="100%"
            />
          </Box>

          <Divider label="o personal municipal con CityPass+" labelPosition="center" mb={24} />

          <Box mb={16}>
            <Text fw={600} fz="sm" mb={4}>Acceso Administrativo (CityPass+)</Text>
            <Text c="dimmed" fz="xs" mb="md">
              Ingresá con tus credenciales asignadas por el delegado de CityPass+.
            </Text>
          </Box>

          <form onSubmit={handleAdminLogin}>
            <TextInput
              label="Usuario"
              placeholder="jperez"
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
              mt="md"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />

            <Button
              fullWidth
              mt={24}
              type="submit"
              color="dark"
              size="md"
              leftSection={<IconLogin size="1.1rem" />}
              loading={submitting}
            >
              Iniciar sesión con CityPass+
            </Button>
          </form>

          {isDemoMode && (
            <>
              <Divider my={24} />
              <Flex justify="space-between" align="flex-end" gap="md">
                <Box>
                  <Text fw={700} size="xs">Acceso local de prueba</Text>
                  <Text size="xs" c="dimmed">admin / 1234 (o ciudadano / 1234)</Text>
                </Box>
                <Anchor size="xs" component="button" onClick={() => navigate('/register')}>
                  Registro ciudadano de prueba
                </Anchor>
              </Flex>
            </>
          )}
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
