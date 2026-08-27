import { Alert, Anchor, Box, Button, Container, Group, Paper, PasswordInput, Text, TextInput, Title } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('ciudadano');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const user = await login(email, password);
      navigate(user.role === 'municipal_admin' ? '/admin' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box bg="gray.0" h="100vh" style={{ display: 'flex', alignItems: 'center' }}>
      <Container size={420} w="100%">
        <Title ta="center">
          ¡Bienvenido de nuevo!
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          Usá uno de los perfiles de prueba del módulo.
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <TextInput 
              label="Usuario" 
              placeholder="ciudadano o admin" 
              required 
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput 
              label="Contraseña" 
              placeholder="Tu contraseña" 
              required 
              mt="md" 
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            
            <Button fullWidth mt="xl" type="submit" color="blue" loading={submitting}>
              Iniciar Sesión
            </Button>
          </form>

          <Box mt="xl">
            <Text fw={700} size="sm">Ciudadano</Text>
            <Text size="sm" c="dimmed">ciudadano / 1234</Text>
            <Group justify="space-between" mt="md">
              <Box>
                <Text fw={700} size="sm">Gestión Municipal</Text>
                <Text size="sm" c="dimmed">admin / 1234</Text>
              </Box>
              <Anchor size="sm" component="button" onClick={() => navigate('/register')}>
                Crear cuenta
              </Anchor>
            </Group>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
