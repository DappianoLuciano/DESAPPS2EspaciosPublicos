import '@mantine/core/styles.css';
import { Container, Group, MantineProvider, Modal, Paper, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AccountMenu from '../src/components/AccountMenu';
const base={id:'9e39da35-cbed-44a5-b08c-b007131a730a',email:'persona@example.com',role:'citizen' as const,name:'María González'};
export function Preview(){
 const [notice,setNotice]=useState(false);
 return <MantineProvider><MemoryRouter><Container size="sm" py="xl"><Title order={1}>Tarjetas de cuenta</Title><Text size="sm" c="dimmed" mb="xl">Perfiles de ejemplo. No modifica sesiones reales.</Text>
  <Stack gap={260}>
   <Paper withBorder p="md" radius="md"><Group justify="space-between"><Text fw={700}>Gestión Municipal</Text><AccountMenu user={{...base,name:'delegado-esp',role:'municipal_admin'}} uid="delegado-esp" provider="citypass" organization="Espacios" onLogout={()=>setNotice(true)} /></Group></Paper>
   <Paper withBorder p="md" radius="md"><Group justify="space-between"><Text fw={700}>Agenda cultural</Text><AccountMenu user={base} provider="google" onLogout={()=>setNotice(true)} /></Group></Paper>
  </Stack>
  <Modal opened={notice} onClose={()=>setNotice(false)} title="Acción de prueba">Cierre simulado. No se cerró ninguna sesión real.</Modal>
 </Container></MemoryRouter></MantineProvider>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
