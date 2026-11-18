import '@mantine/core/styles.css';
import { Container, MantineProvider, Modal, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PublicSpacesTable from '../src/components/PublicSpacesTable';
import type { PublicSpace } from '../src/lib/api';
const date=(hours:number)=>new Date(Date.now()+hours*3600_000).toISOString();
const base:PublicSpace={id:'s1',name:'Uade',address:'Lima 757',zone:'Monserrat',capacity:200,status:'ENABLED',category:'SALON',exposure:'MIXED',latitude:-34.61,longitude:-58.38,description:'Ejemplo',createdAt:date(-1)};
const spaces:PublicSpace[]=[base,
  {...base,id:'s2',name:'Centro Cultural Artes del Parque Chacabuco',address:'Cachimayo 1657',zone:'Parque Chacabuco'},
  {...base,id:'s3',name:'Centro Cultural Aníbal Troilo',address:'Gorriti 5740',zone:'Palermo',capacity:220},
  {...base,id:'s4',name:'El Cultural San Martín',address:'Sarmiento 1551',zone:'San Nicolás',capacity:900,weatherRestrictions:[{alertId:'a1',validFrom:date(-1),validUntil:date(23)}]},
  {...base,id:'s5',name:'Anfiteatro Municipal Eva Perón del Parque Centenario',address:'Av. Díaz Vélez 4850',zone:'Caballito',category:'AUDITORIO',capacity:1400,status:'DISABLED',exposure:'OUTDOOR'},
  {...base,id:'s6',name:'Plaza de ejemplo',category:'PLAZA',exposure:'OUTDOOR',weatherRestrictions:[{alertId:'a2',validFrom:date(2),validUntil:date(6)}]},
];
export function Preview(){
  const [action,setAction]=useState('');
  return <MantineProvider><Container size="xl" py="xl"><Title order={1}>Espacios Públicos</Title><Text c="dimmed" mb="xl">Vista de prueba local. No modifica datos ni publica en EDA.</Text>
    <PublicSpacesTable spaces={spaces} loading={false} onEdit={s=>setAction(`Editar ${s.name}`)} onToggle={s=>setAction(`Cambiar estado general de ${s.name}`)} onDelete={s=>setAction(`Eliminar ${s.name}`)} onRefresh={()=>setAction('Actualización local de ejemplo')} />
    <Modal opened={!!action} onClose={()=>setAction('')} title="Acción de prueba"><Text>{action}. No se ejecuta ninguna operación real.</Text></Modal>
  </Container></MantineProvider>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
