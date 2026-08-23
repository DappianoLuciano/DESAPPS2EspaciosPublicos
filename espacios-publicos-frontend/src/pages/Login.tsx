import { TextInput, PasswordInput, Checkbox, Anchor, Paper, Title, Text, Container, Group, Button, Box, SegmentedControl } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email || 'ciudadano@buenosaires.gob.ar', role);
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <Box bg="gray.0" h="100vh" style={{ display: 'flex', alignItems: 'center' }}>
      <Container size={420} w="100%">
        <Title ta="center" style={{ fontFamily: 'Space Grotesk' }}>
          ¡Bienvenido de nuevo!
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          ¿No tienes una cuenta?{' '}
          <Anchor size="sm" component="button" onClick={() => navigate('/register')}>
            Regístrate
          </Anchor>
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form onSubmit={handleLogin}>
            <SegmentedControl
              fullWidth
              mb="md"
              value={role}
              onChange={(v) => setRole(v as 'user' | 'admin')}
              data={[
                { label: 'Ciudadano', value: 'user' },
                { label: 'Gestión Municipal', value: 'admin' },
              ]}
            />
            
            <TextInput 
              label="Correo electrónico" 
              placeholder="tu@email.com" 
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
            
            <Group justify="space-between" mt="lg">
              <Checkbox label="Recordarme" />
              <Anchor component="button" size="sm">
                ¿Olvidaste tu contraseña?
              </Anchor>
            </Group>
            
            <Button fullWidth mt="xl" type="submit" color="blue">
              Iniciar Sesión
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
