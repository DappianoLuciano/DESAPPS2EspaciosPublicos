# CityPass+ Espacios Publicos y Cultura

Aplicacion para publicar eventos culturales, administrar espacios publicos y gestionar reservas ciudadanas.

## Estructura

- `espacios-publicos-backend`: API Express, Prisma, PostgreSQL y Supabase Storage.
- `espacios-publicos-frontend`: aplicacion React y Vite.

## Requisitos

- Node.js 20 o superior.
- npm.
- El archivo `.env` privado del backend entregado por el responsable del proyecto.

## Primera vez o despues de actualizar

### Primera vez despues de clonar

Preparar el backend:

```bash
cd espacios-publicos-backend
npm install
cp .env.example .env
```

Completar `.env` con las credenciales privadas compartidas por el responsable. No copiar los placeholders de `.env.example` como si fueran credenciales reales.

Luego generar Prisma y verificar la conexion:

```bash
npm run prisma:generate
npm run prisma:status
```

Preparar el frontend:

```bash
cd ../espacios-publicos-frontend
npm install
cp .env.example .env
```

El comando `cp .env.example .env` se usa solamente la primera vez. Si `.env` ya existe, no volver a copiarlo porque se reemplazarian las credenciales privadas.

### Despues de actualizar con Git

Si se descargaron cambios nuevos con `git pull`, actualizar dependencias y regenerar Prisma:

```bash
cd espacios-publicos-backend
npm install
npm run prisma:generate
npm run prisma:status

cd ../espacios-publicos-frontend
npm install
```

No hace falta volver a crear ni modificar los `.env` despues de cada `git pull`.

## Para correr el proyecto cada vez

Terminal 1, backend:

```bash
cd espacios-publicos-backend
npm run dev
```

Terminal 2, frontend:

```bash
cd espacios-publicos-frontend
npm run dev
```

- API: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/health`
- Aplicacion: `http://localhost:5173`

## Usuarios de prueba

| Perfil | Usuario | Contrasena |
| --- | --- | --- |
| Ciudadano | `ciudadano` | `1234` |
| Administrador | `admin` | `1234` |

## Base compartida

El backend local se conecta a una instancia compartida de Supabase. Los eventos, reservas e imagenes creados desde cualquier computadora son visibles para todo el equipo.

No ejecutar estos comandos sin coordinarlo con el responsable de la base:

```bash
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:push
npm run prisma:seed
```

Para comprobar el estado sin modificar datos se puede usar:

```bash
npm run prisma:status
```

## Verificacion

Backend:

```bash
cd espacios-publicos-backend
npm test
npm run build
```

Frontend:

```bash
cd espacios-publicos-frontend
npm run lint
npm run build
```

## Seguridad

- `.env.example` se versiona y contiene solamente placeholders.
- `.env` contiene credenciales reales y esta ignorado por Git.
- La secret key de Supabase se usa exclusivamente en el backend.
- No subir credenciales a commits, issues, chats publicos ni capturas de pantalla.
