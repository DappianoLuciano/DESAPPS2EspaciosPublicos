const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const spaces = [
  {
    id: 'seed-space-recoleta',
    name: 'Centro Cultural Recoleta',
    description: 'Centro cultural con salas de exposición, auditorio, cine y espacios para música, danza y actividades contemporáneas.',
    address: 'Junín 1930',
    zone: 'Recoleta',
    capacity: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-space-usina',
    name: 'Usina del Arte',
    description: 'Espacio cultural de La Boca dedicado a la música, las artes visuales, la danza y propuestas para toda la familia.',
    address: 'Agustín R. Caffarena 1',
    zone: 'La Boca',
    capacity: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-space-san-martin',
    name: 'El Cultural San Martín',
    description: 'Complejo cultural con salas para teatro, cine, música, artes visuales, literatura y formación.',
    address: 'Sarmiento 1551',
    zone: 'San Nicolás',
    capacity: 900,
    imageUrl: 'https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-space-25-mayo',
    name: 'Complejo Cultural 25 de Mayo',
    description: 'Teatro y centro cultural de Villa Urquiza con programación escénica, musical y comunitaria.',
    address: 'Av. Triunvirato 4444',
    zone: 'Villa Urquiza',
    capacity: 800,
    imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-space-planetario',
    name: 'Planetario Galileo Galilei',
    description: 'Espacio de divulgación científica y astronómica con sala de espectáculos y actividades educativas.',
    address: 'Av. Sarmiento s/n',
    zone: 'Palermo',
    capacity: 360,
    imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-space-parque-centenario',
    name: 'Anfiteatro del Parque Centenario',
    description: 'Anfiteatro al aire libre utilizado para conciertos, danza, cine y festivales culturales.',
    address: 'Leopoldo Marechal y Lillo',
    zone: 'Caballito',
    capacity: 1600,
    imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-space-olmedo',
    name: 'Centro Cultural Alberto Olmedo',
    description: 'Centro cultural barrial con talleres, encuentros vecinales y actividades artísticas.',
    address: 'Luis Viale 1052',
    zone: 'Caballito',
    capacity: 180,
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-space-storni',
    name: 'Centro Cultural Alfonsina Storni',
    description: 'Espacio de formación y producción cultural con talleres y propuestas abiertas a la comunidad.',
    address: 'Tucumán 3233',
    zone: 'Balvanera',
    capacity: 160,
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-space-troilo',
    name: 'Centro Cultural Aníbal Troilo',
    description: 'Centro cultural barrial orientado a la música, la danza y los talleres comunitarios.',
    address: 'Gorriti 5740',
    zone: 'Palermo',
    capacity: 220,
    imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-space-parque-chacabuco',
    name: 'Centro Cultural Artes del Parque Chacabuco',
    description: 'Espacio cultural de cercanía con talleres de arte, teatro, música y propuestas para infancias.',
    address: 'Cachimayo 1657',
    zone: 'Parque Chacabuco',
    capacity: 200,
    imageUrl: 'https://images.unsplash.com/photo-1545987796-200677ee1011?auto=format&fit=crop&q=80',
  },
];

function futureDate(daysFromNow, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

const eventSeeds = [
  {
    id: 'seed-event-musica-electronica',
    title: 'Laboratorio de música electrónica',
    category: 'Música',
    tags: ['Tecnología', 'Talleres', 'Cultura'],
    description: 'Encuentro práctico para explorar síntesis, ritmo y producción musical con herramientas digitales.',
    requirements: ['Traer auriculares', 'No se requiere experiencia previa'],
    publicSpaceId: 'seed-space-recoleta',
    capacity: 80,
    requiresRegistration: true,
    startsInDays: 5,
    startHour: 18,
    endHour: 20,
    imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-arte-digital',
    title: 'Muestra de arte digital inmersivo',
    category: 'Arte',
    tags: ['Tecnología', 'Cultura'],
    description: 'Recorrido por instalaciones audiovisuales y obras interactivas de artistas emergentes.',
    requirements: [],
    publicSpaceId: 'seed-space-recoleta',
    capacity: 300,
    requiresRegistration: false,
    startsInDays: 12,
    startHour: 16,
    endHour: 21,
    imageUrl: 'https://images.unsplash.com/photo-1551913902-c92207136625?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-sinfonica',
    title: 'Concierto sinfónico para toda la familia',
    category: 'Música',
    tags: ['Infancias', 'Cultura'],
    description: 'Una introducción cercana al repertorio orquestal con participación del público.',
    requirements: ['Ingreso hasta 15 minutos antes del comienzo'],
    publicSpaceId: 'seed-space-usina',
    capacity: 900,
    requiresRegistration: true,
    startsInDays: 7,
    startHour: 17,
    endHour: 19,
    imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-gastronomia',
    title: 'Sabores de los barrios',
    category: 'Gastronomía',
    tags: ['Cultura', 'Talleres'],
    description: 'Clases abiertas, relatos de cocina y una feria de productores de distintos barrios porteños.',
    requirements: [],
    publicSpaceId: 'seed-space-usina',
    capacity: 500,
    requiresRegistration: false,
    startsInDays: 15,
    startHour: 12,
    endHour: 18,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-cine-debate',
    title: 'Cine y debate: ciudades del futuro',
    category: 'Cine',
    tags: ['Tecnología', 'Charlas', 'Ciencia'],
    description: 'Proyección y conversación con especialistas sobre tecnología, ambiente y vida urbana.',
    requirements: ['Actividad recomendada para mayores de 13 años'],
    publicSpaceId: 'seed-space-san-martin',
    capacity: 240,
    requiresRegistration: true,
    startsInDays: 9,
    startHour: 19,
    endHour: 21,
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-teatro-comunitario',
    title: 'Escena abierta de teatro comunitario',
    category: 'Teatro',
    tags: ['Cultura', 'Talleres'],
    description: 'Una jornada de escenas breves creadas por elencos y talleres de distintos barrios.',
    requirements: [],
    publicSpaceId: 'seed-space-25-mayo',
    capacity: 600,
    requiresRegistration: true,
    startsInDays: 11,
    startHour: 20,
    endHour: 22,
    imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-ciencia-estrellas',
    title: 'Ciencia bajo las estrellas',
    category: 'Ciencia',
    tags: ['Tecnología', 'Cultura', 'Charlas'],
    description: 'Una experiencia de astronomía, visualización del cielo y conversación sobre exploración espacial.',
    requirements: ['Presentarse 15 minutos antes', 'Actividad sujeta a condiciones meteorológicas'],
    publicSpaceId: 'seed-space-planetario',
    capacity: 300,
    requiresRegistration: true,
    startsInDays: 6,
    startHour: 19,
    endHour: 21,
    imageUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-jazz-parque',
    title: 'Jazz al atardecer',
    category: 'Música',
    tags: ['Cultura'],
    description: 'Concierto al aire libre con ensambles locales y repertorio de jazz contemporáneo.',
    requirements: [],
    publicSpaceId: 'seed-space-parque-centenario',
    capacity: 1400,
    requiresRegistration: false,
    startsInDays: 10,
    startHour: 18,
    endHour: 20,
    imageUrl: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-fotografia-barrial',
    title: 'Taller de fotografía barrial',
    category: 'Talleres',
    tags: ['Arte', 'Cultura'],
    description: 'Recorrido y práctica para registrar historias, arquitectura y escenas cotidianas del barrio.',
    requirements: ['Traer cámara o teléfono con cámara'],
    publicSpaceId: 'seed-space-olmedo',
    capacity: 45,
    requiresRegistration: true,
    startsInDays: 8,
    startHour: 15,
    endHour: 18,
    imageUrl: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-poesia',
    title: 'Ronda de poesía y lectura',
    category: 'Literatura',
    tags: ['Cultura', 'Charlas'],
    description: 'Lecturas abiertas y conversación con autores y autoras de la escena independiente.',
    requirements: [],
    publicSpaceId: 'seed-space-storni',
    capacity: 100,
    requiresRegistration: false,
    startsInDays: 13,
    startHour: 18,
    endHour: 20,
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-tango',
    title: 'Práctica abierta de tango',
    category: 'Danza',
    tags: ['Música', 'Cultura', 'Talleres'],
    description: 'Clase inicial y práctica guiada para aprender pasos básicos y compartir la pista.',
    requirements: ['Calzado cómodo'],
    publicSpaceId: 'seed-space-troilo',
    capacity: 150,
    requiresRegistration: true,
    startsInDays: 14,
    startHour: 19,
    endHour: 21,
    imageUrl: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?auto=format&fit=crop&q=80',
  },
  {
    id: 'seed-event-infancias',
    title: 'Fábrica de personajes',
    category: 'Infancias',
    tags: ['Arte', 'Teatro', 'Talleres'],
    description: 'Taller creativo de máscaras, relatos y juego teatral para chicas y chicos.',
    requirements: ['Actividad para niñas y niños de 6 a 12 años', 'Asistir con una persona adulta responsable'],
    publicSpaceId: 'seed-space-parque-chacabuco',
    capacity: 60,
    requiresRegistration: true,
    startsInDays: 16,
    startHour: 15,
    endHour: 17,
    imageUrl: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&q=80',
  },
];

async function main() {
  await prisma.admin.upsert({
    where: { id: 'admin-1' },
    update: {},
    create: {
      id: 'admin-1',
      username: 'admin',
      name: 'Gestión Municipal',
      email: 'admin@citypass.test',
      phone: '+54 11 0000-0000',
      department: 'Cultura y Espacios Públicos',
    },
  });

  for (const space of spaces) {
    await prisma.publicSpace.upsert({
      where: { id: space.id },
      update: { ...space, status: 'ENABLED' },
      create: { ...space, status: 'ENABLED' },
    });
  }

  for (const event of eventSeeds) {
    const { startsInDays, startHour, endHour, ...eventData } = event;
    const startDate = futureDate(startsInDays, startHour);
    const endDate = futureDate(startsInDays, endHour);
    const data = {
      ...eventData,
      organizerName: 'Gestión Municipal',
      startDate,
      endDate,
      status: 'ACTIVE',
    };

    await prisma.communityEvent.upsert({
      where: { id: event.id },
      update: data,
      create: data,
    });
  }

  console.log(`Seed completo: 1 admin, ${spaces.length} espacios y ${eventSeeds.length} eventos de demostración.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
