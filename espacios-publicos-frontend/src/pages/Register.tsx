import { Anchor, Paper, Title, Text, Container, Button, Box } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await login('ciudadano', '1234');
    navigate('/');
  };

  return (
    <Box bg="gray.0" h="100vh" style={{ display: 'flex', alignItems: 'center' }}>
      <Container size={420} w="100%">
        <Box style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        </Box>
        <Title ta="center">Acceso ciudadano de demostración</Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          ¿Ya tienes cuenta?{' '}
          <Anchor size="sm" component="button" onClick={() => navigate('/login')}>
            Inicia Sesión
          </Anchor>
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Text size="sm" c="dimmed">
            Esta pantalla no crea una cuenta real. En desarrollo permite ingresar con el perfil
            ciudadano utilizado para probar la aplicación.
          </Text>
          <form onSubmit={handleRegister}>
            <Button fullWidth mt="xl" type="submit" color="blue">
              Ingresar como ciudadano de prueba
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
