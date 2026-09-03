# CityPass+ Espacios Publicos y Cultura

[![CI Pipeline](https://github.com/USUARIO/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/USUARIO/REPO/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/USUARIO/REPO/actions/workflows/cd.yml/badge.svg)](https://github.com/USUARIO/REPO/actions/workflows/cd.yml)
[![PR Checks](https://github.com/USUARIO/REPO/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/USUARIO/REPO/actions/workflows/pr-checks.yml)
[![SonarQube](https://github.com/USUARIO/REPO/actions/workflows/sonarqube.yml/badge.svg)](https://github.com/USUARIO/REPO/actions/workflows/sonarqube.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DappianoLuciano_DESAPPS2EspaciosPublicos&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DappianoLuciano_DESAPPS2EspaciosPublicos)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DappianoLuciano_DESAPPS2EspaciosPublicos&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DappianoLuciano_DESAPPS2EspaciosPublicos)

Aplicacion para publicar eventos culturales, administrar espacios publicos y gestionar reservas ciudadanas.

> **Nota:** Reemplazar `USUARIO/REPO` en los badges de GitHub Actions con tu usuario y repositorio real.

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

## Pipeline CI/CD

El proyecto incluye pipelines automatizados de GitHub Actions:

- **CI Pipeline** - Ejecuta tests, linting y builds automáticamente en cada push/PR
- **CD Pipeline** - Despliega automáticamente a producción en merge a `main`
- **PR Checks** - Valida PRs con checks de calidad y seguridad
- **SonarQube Analysis** - Análisis de calidad de código, bugs, vulnerabilidades y code smells
- **Security Scan** - Escaneos de seguridad semanales

### Documentación del Pipeline

- [📋 QUICKSTART.md](.github/QUICKSTART.md) - Inicio rápido (<10 minutos)
- [📘 PIPELINE.md](.github/PIPELINE.md) - Configuración completa
- [🔍 SONARQUBE_SETUP.md](.github/SONARQUBE_SETUP.md) - Setup de SonarQube
- [🏗️ ARCHITECTURE.md](.github/ARCHITECTURE.md) - Arquitectura técnica
