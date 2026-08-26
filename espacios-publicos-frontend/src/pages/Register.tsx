import { TextInput, PasswordInput, Anchor, Paper, Title, Text, Container, Button, Box } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    login(email || 'ciudadano@buenosaires.gob.ar', 'user'); // Defaults to user on register
    navigate('/');
  };

  return (
    <Box bg="gray.0" h="100vh" style={{ display: 'flex', alignItems: 'center' }}>
      <Container size={420} w="100%">
        <Title ta="center">
          Crear una cuenta
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          ¿Ya tienes cuenta?{' '}
          <Anchor size="sm" component="button" onClick={() => navigate('/login')}>
            Inicia Sesión
          </Anchor>
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form onSubmit={handleRegister}>
            <TextInput 
              label="Nombre completo" 
              placeholder="Juan Pérez" 
              required 
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              mb="md"
            />
            <TextInput 
              label="Correo electrónico" 
              placeholder="tu@email.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              mb="md"
            />
            <PasswordInput 
              label="Contraseña" 
              placeholder="Tu contraseña" 
              required 
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            
            <Button fullWidth mt="xl" type="submit" color="blue">
              Registrarse
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
