# CityPass+ Espacios Publicos y Cultura

[![CI Pipeline](https://github.com/DappianoLuciano/DESAPPS2EspaciosPublicos/actions/workflows/ci.yml/badge.svg)](https://github.com/DappianoLuciano/DESAPPS2EspaciosPublicos/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/DappianoLuciano/DESAPPS2EspaciosPublicos/actions/workflows/cd.yml/badge.svg)](https://github.com/DappianoLuciano/DESAPPS2EspaciosPublicos/actions/workflows/cd.yml)
[![PR Checks](https://github.com/DappianoLuciano/DESAPPS2EspaciosPublicos/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/DappianoLuciano/DESAPPS2EspaciosPublicos/actions/workflows/pr-checks.yml)
[![SonarQube](https://github.com/DappianoLuciano/DESAPPS2EspaciosPublicos/actions/workflows/sonarqube.yml/badge.svg)](https://github.com/DappianoLuciano/DESAPPS2EspaciosPublicos/actions/workflows/sonarqube.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DappianoLuciano_DESAPPS2EspaciosPublicos&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DappianoLuciano_DESAPPS2EspaciosPublicos)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DappianoLuciano_DESAPPS2EspaciosPublicos&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DappianoLuciano_DESAPPS2EspaciosPublicos)

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

## Alternativa: correr todo con Docker Compose

En vez de las dos terminales de arriba, se puede levantar todo el stack (Postgres local + backend + frontend) con un solo comando. Requiere Docker Desktop (o Docker Engine + Compose plugin) instalado.

Este modo usa un Postgres local descartable, no la Supabase compartida del equipo. Es un stack aislado pensado para probar el proyecto completo sin tocar datos compartidos.

### Por que hay un cuarto contenedor de proxy TLS

El backend exige HTTPS en modo `production` (ver `espacios-publicos-backend/src/interfaces/http/middlewares/httpSecurity.ts`) y el build del frontend exige que `VITE_API_URL` sea una URL `https://` real (ver `espacios-publicos-frontend/vite.config.ts`). Como el stack local no tiene un dominio ni un certificado real, `docker-compose.yml` agrega un cuarto servicio (`tls-proxy`, Caddy) que termina HTTPS con un certificado autofirmado delante del backend, sin modificar ese codigo de seguridad. El navegador va a mostrar una advertencia de certificado no confiable la primera vez que se acceda a `https://127.0.0.1:8443`; hay que aceptarla manualmente una vez (los pasos exactos dependen del navegador).

### Primera vez

```bash
cp .env.example .env
```

Revisar el `.env` generado en la raiz del repo (no el de cada carpeta) y completar lo que haga falta. Por defecto ya viene configurado para funcionar sin credenciales reales de Google (usa el login mockeado).

### Levantar el stack

```bash
docker compose up --build
```

Docker Compose espera a que cada servicio este saludable (Postgres, luego backend, luego el proxy TLS) antes de arrancar el siguiente, gracias a los `healthcheck` y `depends_on: condition: service_healthy` de `docker-compose.yml`.

- Aplicacion: `http://localhost:5173`
- API (via proxy TLS, certificado autofirmado): `https://127.0.0.1:8443`
- Healthcheck del backend: `https://127.0.0.1:8443/health`
- Postgres: `localhost:5432` (usuario/clave/DB definidos en `.env`)

### Migraciones (solo la primera vez, o tras cambiar el schema)

El Postgres local arranca vacio. Correr las migraciones de Prisma contra el, desde la carpeta del backend en el host (no dentro del contenedor, que no incluye el CLI de Prisma en la imagen de produccion):

```bash
cd espacios-publicos-backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/citypass_espacios_cultura" \
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/citypass_espacios_cultura" \
npx --yes prisma@5.22.0 migrate deploy
```

Se fija la version de Prisma (`@5.22.0`, la misma de `package.json`) para evitar que `npx` traiga la ultima version mayor si todavia no se corrio `npm install` en el backend; una version mas nueva de Prisma no es compatible con este `schema.prisma`. Ajustar usuario, clave y nombre de base si se cambiaron en el `.env` de la raiz.

### Apagar

```bash
docker compose down
```

Agregar `-v` si tambien se quieren borrar los datos del Postgres local (`docker compose down -v`).

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

## Pipeline CI/CD

El proyecto incluye pipelines automatizados de GitHub Actions:

- **CI Pipeline** - Ejecuta tests, linting y builds automáticamente en cada push/PR
- **Deploy a producción** - Vía integración nativa de Vercel (no GitHub Actions), ver [VERCEL_SETUP.md](.github/VERCEL_SETUP.md)
- **PR Checks** - Valida PRs con checks de calidad y seguridad
- **SonarQube Analysis** - Análisis de calidad de código, bugs, vulnerabilidades y code smells
- **Security Scan** - Escaneos de seguridad semanales

### Documentación del Pipeline

- [📋 QUICKSTART.md](.github/QUICKSTART.md) - Inicio rápido (<10 minutos)
- [📘 PIPELINE.md](.github/PIPELINE.md) - Configuración completa
- [▲ VERCEL_SETUP.md](.github/VERCEL_SETUP.md) - Configuración de los proyectos de Vercel
- [🔍 SONARQUBE_SETUP.md](.github/SONARQUBE_SETUP.md) - Setup de SonarQube
- [🏗️ ARCHITECTURE.md](.github/ARCHITECTURE.md) - Arquitectura técnica
