# CityPass+ Backend

API para gestionar espacios publicos, eventos culturales, reservas, inscripciones y perfiles administrativos.

## Stack

- Node.js, Express y TypeScript.
- Prisma y PostgreSQL alojado en Supabase.
- Supabase Storage para imagenes de eventos.
- Jest y Supertest.

## Instalacion

```bash
npm install
cp .env.example .env
```

Solicitar al responsable del proyecto los valores privados y completar `.env`:

```env
PORT=3000
DATABASE_URL="..."
DIRECT_URL="..."
SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_EVENT_IMAGES_BUCKET="event-images"
```

Generar Prisma y comprobar la conexion:

```bash
npm run prisma:generate
npm run prisma:status
```

Levantar la API:

```bash
npm run dev
```

- API: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/health`

## Comandos habituales

```bash
npm run dev
npm test
npm run build
npm run prisma:generate
npm run prisma:status
npm run prisma:studio
```

## Base de datos compartida

Supabase ya tiene aplicadas las migraciones y los datos de demostracion. Para desarrollar y probar la aplicacion no hace falta volver a migrar ni ejecutar el seed.

Los siguientes comandos modifican la estructura o los datos compartidos y deben ejecutarse solamente de forma coordinada:

```bash
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:push
npm run prisma:seed
```

## Arquitectura

- `domain`: entidades y contratos.
- `application`: casos de uso y DTOs.
- `infrastructure`: Prisma, Storage y EventBus.
- `interfaces/http`: rutas, controladores y middlewares.

## Variables y secretos

`.env.example` documenta el formato esperado, pero no contiene valores funcionales. El archivo `.env` real no debe subirse a Git. La `SUPABASE_SERVICE_ROLE_KEY` permite acceso elevado y debe permanecer exclusivamente en el backend.
