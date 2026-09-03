# Pipeline CI/CD - Configuración

Este documento explica cómo configurar y usar el pipeline CI/CD del proyecto.

## 📋 Estructura del Pipeline

### CI Pipeline (`ci.yml`)
Se ejecuta automáticamente en:
- Push a `main` o `develop`
- Pull requests a `main` o `develop`

**Pasos:**
1. **Backend CI**
   - Instalación de dependencias
   - Generación de Prisma Client
   - Ejecución de tests
   - Build del backend
   - Subida de artefactos

2. **Frontend CI**
   - Instalación de dependencias
   - Linting con oxlint
   - Build del frontend
   - Subida de artefactos

3. **Integration Check**
   - Verifica que ambos builds se completaron exitosamente
   - Descarga y valida los artefactos

### CD Pipeline (`cd.yml`)
Se ejecuta automáticamente en:
- Push a `main`
- Manualmente desde GitHub Actions

**Pasos:**
1. **Deploy Backend** (configuración preparada para Railway)
2. **Deploy Frontend** (configuración preparada para Vercel)
3. **Post-deployment checks** (health checks y validaciones)

## 🔐 Secrets y Variables Requeridos

### Para CI (Continuos Integration)

Ir a: `Settings > Secrets and variables > Actions > Repository secrets`

| Secret | Descripción | Requerido para CI |
|--------|-------------|-------------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL de prueba | ⚠️ Opcional (usa mock si no está) |

### Para CD (Continuous Deployment)

#### Secrets
| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `DATABASE_URL` | URL de base de datos de producción | `postgresql://user:pass@host:5432/db` |
| `RAILWAY_TOKEN` | Token de Railway CLI | Obtener de Railway dashboard |
| `VERCEL_TOKEN` | Token de Vercel | Obtener de Vercel settings |
| `VERCEL_ORG_ID` | ID de organización de Vercel | Del archivo `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | ID del proyecto en Vercel | Del archivo `.vercel/project.json` |
| `VITE_API_URL` | URL de la API en producción | `https://api.tu-dominio.com` |

#### Variables (no secretas)
Ir a: `Settings > Secrets and variables > Actions > Variables`

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DEPLOY_BACKEND` | `true` o `false` | Habilitar deploy automático del backend |
| `DEPLOY_FRONTEND` | `true` o `false` | Habilitar deploy automático del frontend |
| `RUN_MIGRATIONS` | `true` o `false` | Ejecutar migraciones de BD en deploy |
| `API_URL` | URL de tu API | Para health checks post-deployment |

## 🚀 Plataformas de Deployment Soportadas

### Backend

#### Opción 1: Railway (Recomendado)
1. Crear cuenta en [Railway](https://railway.app)
2. Crear nuevo proyecto
3. Conectar repositorio de GitHub
4. Obtener `RAILWAY_TOKEN` de Railway dashboard
5. Configurar variables de entorno en Railway:
   - `DATABASE_URL`
   - `PORT`
   - `NODE_ENV=production`

#### Opción 2: Render
1. Crear cuenta en [Render](https://render.com)
2. Crear nuevo Web Service
3. Conectar repositorio
4. Obtener el Deploy Hook URL
5. Añadir como secret: `RENDER_DEPLOY_HOOK_BACKEND`

### Frontend

#### Opción 1: Vercel (Recomendado)
1. Instalar Vercel CLI: `npm i -g vercel`
2. En el directorio del frontend: `vercel`
3. Seguir el wizard de configuración
4. Obtener los tokens del archivo `.vercel/project.json`
5. Configurar secrets en GitHub:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

#### Opción 2: Netlify
1. Crear cuenta en [Netlify](https://netlify.com)
2. Obtener `NETLIFY_AUTH_TOKEN` y `NETLIFY_SITE_ID`
3. Descomentar la sección de Netlify en `cd.yml`
4. Comentar la sección de Vercel

## 📝 Configuración Paso a Paso

### 1. Configurar Secrets en GitHub

```bash
# En GitHub:
Settings > Secrets and variables > Actions > New repository secret
```

Agregar uno por uno los secrets listados arriba.

### 2. Habilitar GitHub Actions

Si es la primera vez:
```bash
Settings > Actions > General > Allow all actions and reusable workflows
```

### 3. Configurar Environment de Producción (Opcional)

```bash
Settings > Environments > New environment
Nombre: production
```

Puedes añadir:
- Required reviewers (aprobar deploys manualmente)
- Wait timer (esperar X minutos antes de deployar)
- Deployment branches (solo `main`)

### 4. Testing Local del Pipeline

Verificar que todo funciona antes de hacer push:

```bash
# Backend
cd espacios-publicos-backend
npm ci
npm run prisma:generate
npm test
npm run build

# Frontend
cd ../espacios-publicos-frontend
npm ci
npm run lint
npm run build
```

## 🎯 Uso del Pipeline

### Ejecutar CI automáticamente
```bash
git checkout -b feature/nueva-funcionalidad
# ... hacer cambios ...
git add .
git commit -m "feat: nueva funcionalidad"
git push origin feature/nueva-funcionalidad
# Crear Pull Request en GitHub
# El CI se ejecutará automáticamente
```

### Ejecutar CD automáticamente
```bash
git checkout main
git merge feature/nueva-funcionalidad
git push origin main
# El CD se ejecutará automáticamente SI:
# - DEPLOY_BACKEND=true
# - DEPLOY_FRONTEND=true
```

### Ejecutar CD manualmente
1. Ir a `Actions` en GitHub
2. Seleccionar `CD Pipeline`
3. Click en `Run workflow`
4. Seleccionar branch `main`
5. Click `Run workflow`

## 🔍 Troubleshooting

### CI falla en "Generate Prisma Client"
**Causa:** Archivo `prisma/schema.prisma` no encontrado o inválido
**Solución:** Verificar que el schema existe y es válido

### CI falla en tests
**Causa:** Tests requieren base de datos
**Solución:** 
- Opción 1: Mockear la BD en tests
- Opción 2: Usar una BD de prueba en GitHub (ejemplo con PostgreSQL service container)

### CD no se ejecuta
**Causa:** Variables `DEPLOY_BACKEND` o `DEPLOY_FRONTEND` no configuradas
**Solución:** Configurar las variables en `Settings > Variables`

### Deploy falla con "secret not found"
**Causa:** Secret no configurado en GitHub
**Solución:** Verificar que el secret existe en `Settings > Secrets`

## 📊 Monitoreo

### Ver estado del pipeline
```bash
# Badge de estado (agregar al README.md):
![CI Pipeline](https://github.com/TU-USUARIO/TU-REPO/actions/workflows/ci.yml/badge.svg)
![CD Pipeline](https://github.com/TU-USUARIO/TU-REPO/actions/workflows/cd.yml/badge.svg)
```

### Logs y Artefactos
1. Ir a `Actions` en GitHub
2. Seleccionar el workflow ejecutado
3. Click en el job para ver logs detallados
4. Los artefactos de build están disponibles por 7 días

## 🔄 Actualizaciones Futuras

### Añadir tests E2E
```yaml
# Agregar en ci.yml después del job frontend
e2e-tests:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [backend, frontend]
  steps:
    # ... configurar Playwright/Cypress
```

### Añadir análisis de código
```yaml
# Agregar SonarCloud, CodeQL, etc.
code-quality:
  name: Code Quality
  runs-on: ubuntu-latest
  steps:
    # ... análisis estático
```

### Añadir notificaciones
```yaml
# Notificar a Slack/Discord cuando deployment falla
- name: Notify deployment
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 📚 Recursos

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Deployment Guide](https://docs.railway.app/deploy/deployments)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
- [Prisma Deploy](https://www.prisma.io/docs/guides/deployment)
