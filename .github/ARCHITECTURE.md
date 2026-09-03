# Arquitectura del Pipeline CI/CD

Este documento describe la arquitectura completa del pipeline CI/CD implementado para el proyecto CityPass+ Espacios Públicos.

## 📊 Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPER WORKFLOW                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  git push/PR     │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       GITHUB ACTIONS                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │   CI Pipeline  │  │  PR Checks     │  │  Security     │  │
│  │   (ci.yml)     │  │  (pr-checks)   │  │  (security)   │  │
│  └────────────────┘  └────────────────┘  └───────────────┘  │
│          │                   │                    │          │
│          ▼                   ▼                    ▼          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              All Checks Passed?                        │ │
│  └────────────────────────────────────────────────────────┘ │
│          │                                                   │
│          ├─── No ──▶ ❌ Fail PR / Block merge               │
│          │                                                   │
│          └─── Yes ─▶ ✅ Allow merge                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Merge to main   │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CD Pipeline (cd.yml)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │ Deploy Backend  │         │ Deploy Frontend │            │
│  │   (Railway)     │         │   (Vercel)      │            │
│  └─────────────────┘         └─────────────────┘            │
│          │                            │                      │
│          ▼                            ▼                      │
│  ┌─────────────┐            ┌─────────────────┐             │
│  │ Run         │            │ Build & Deploy  │             │
│  │ Migrations  │            │ Static Assets   │             │
│  └─────────────┘            └─────────────────┘             │
│          │                            │                      │
│          └────────────┬───────────────┘                      │
│                       ▼                                      │
│           ┌────────────────────────┐                         │
│           │   Health Checks        │                         │
│           └────────────────────────┘                         │
│                       │                                      │
│                       ▼                                      │
│           ┌────────────────────────┐                         │
│           │ ✅ Deployment Success  │                         │
│           └────────────────────────┘                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 CI Pipeline - Flujo Detallado

### Workflow: `ci.yml`

```
Trigger: push/PR a main o develop
│
├─▶ Job: Backend CI
│   ├─ Checkout code
│   ├─ Setup Node.js 20
│   ├─ Install dependencies (npm ci)
│   ├─ Generate Prisma Client
│   ├─ Run tests (Jest)
│   ├─ Build (TypeScript → JavaScript)
│   └─ Upload build artifacts
│
├─▶ Job: Frontend CI (paralelo con Backend)
│   ├─ Checkout code
│   ├─ Setup Node.js 20
│   ├─ Install dependencies (npm ci)
│   ├─ Run linter (oxlint)
│   ├─ Build (Vite)
│   └─ Upload build artifacts
│
├─▶ Job: Integration Check
│   ├─ Download backend artifacts
│   ├─ Download frontend artifacts
│   └─ Verify both builds
│
└─▶ Job: Status Check
    └─ Report overall CI status
```

### Optimizaciones

- **Cache de dependencias**: npm cache con `actions/setup-node`
- **Jobs paralelos**: Backend y Frontend corren simultáneamente
- **Artifacts**: Builds guardados por 7 días para debugging

## ✅ PR Checks - Validaciones

### Workflow: `pr-checks.yml`

```
Trigger: Pull Request (opened/sync/reopened)
│
├─▶ PR Validation
│   ├─ Validate PR title (conventional commits)
│   ├─ Check merge conflicts
│   ├─ Check sensitive files (.env)
│   └─ Check large files (>1MB)
│
├─▶ Code Quality
│   ├─ Check console.log in source
│   └─ Count TODO/FIXME comments
│
├─▶ Dependency Check
│   ├─ npm audit (backend)
│   └─ npm audit (frontend)
│
└─▶ Bundle Size Check
    ├─ Build frontend
    └─ Verify size <10MB
```

### Conventional Commits Validados

El pipeline valida que los títulos de PR sigan este formato:

```
type(scope): description

Types permitidos:
- feat: nueva funcionalidad
- fix: corrección de bug
- docs: documentación
- style: formato (no afecta código)
- refactor: refactorización
- perf: mejora de performance
- test: tests
- build: sistema de build
- ci: configuración CI/CD
- chore: tareas de mantenimiento

Ejemplos:
✅ feat: add user authentication
✅ fix(backend): resolve database connection
✅ docs: update README with setup guide
❌ Add new feature (sin type)
❌ WIP (trabajo en progreso sin descripción)
```

## 🔒 Security Pipeline

### Workflow: `security.yml`

```
Trigger: Schedule (lunes 9am) + manual + push a main
│
├─▶ Dependency Audit
│   ├─ npm audit (backend)
│   ├─ npm audit (frontend)
│   └─ Upload audit results
│
├─▶ Secret Scanning
│   ├─ Scan for hardcoded passwords/keys
│   ├─ Check for exposed tokens
│   └─ Verify .env not committed
│
└─▶ CodeQL Analysis
    ├─ Initialize CodeQL
    ├─ Autobuild
    └─ Analyze for vulnerabilities
```

### Patrones de Secrets Detectados

- `password = "..."`
- `api_key = "..."`
- `secret = "..."`
- `token = "..."`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` con credenciales

## 🚀 CD Pipeline - Deployment

### Workflow: `cd.yml`

```
Trigger: push a main + manual
│
├─▶ Deploy Backend
│   ├─ Run full CI pipeline
│   ├─ Generate Prisma
│   ├─ Build production
│   ├─ Deploy to Railway
│   └─ Run migrations (si habilitado)
│
├─▶ Deploy Frontend (paralelo)
│   ├─ Install dependencies
│   ├─ Build con env vars
│   └─ Deploy to Vercel
│
└─▶ Post-Deployment
    ├─ Verify deployments
    └─ Health check API
```

### Variables de Control

| Variable | Tipo | Propósito |
|----------|------|-----------|
| `DEPLOY_BACKEND` | Variable | `true` para auto-deploy backend |
| `DEPLOY_FRONTEND` | Variable | `true` para auto-deploy frontend |
| `RUN_MIGRATIONS` | Variable | `true` para ejecutar migraciones |
| `DATABASE_URL` | Secret | Conexión a PostgreSQL |
| `RAILWAY_TOKEN` | Secret | Auth Railway CLI |
| `VERCEL_TOKEN` | Secret | Auth Vercel |
| `VITE_API_URL` | Secret | URL de API para frontend |

## 🤖 Dependabot

### Configuración: `dependabot.yml`

```
Backend Dependencies (npm)
├─ Schedule: Lunes 9am
├─ Max PRs: 5
├─ Groups:
│  ├─ Dev deps (minor/patch)
│  └─ Prod deps (patch only)
└─ Labels: dependencies, backend

Frontend Dependencies (npm)
├─ Schedule: Lunes 9am
├─ Max PRs: 5
├─ Groups:
│  ├─ Dev deps (minor/patch)
│  └─ Prod deps (patch only)
└─ Labels: dependencies, frontend

GitHub Actions
├─ Schedule: Mensual
└─ Labels: dependencies, ci
```

## 📈 Métricas y Monitoreo

### Artifacts Guardados

| Artifact | Retention | Propósito |
|----------|-----------|-----------|
| `backend-build` | 7 días | Debug build issues |
| `frontend-build` | 7 días | Debug build issues |
| `security-audit-results` | 30 días | Track vulnerabilities |

### Badges de Estado

```markdown
# En README.md
[![CI Pipeline](https://github.com/USER/REPO/actions/workflows/ci.yml/badge.svg)]
[![CD Pipeline](https://github.com/USER/REPO/actions/workflows/cd.yml/badge.svg)]
[![PR Checks](https://github.com/USER/REPO/actions/workflows/pr-checks.yml/badge.svg)]
```

## 🔐 Seguridad del Pipeline

### Secrets Management

1. **Almacenamiento**: GitHub Secrets (encriptados)
2. **Acceso**: Solo workflows autorizados
3. **Exposición**: Nunca en logs (masked)
4. **Rotación**: Manual cuando sea necesario

### Environments

- **Production**: Requiere aprobación manual (opcional)
- **Deployment branches**: Solo `main`
- **Wait timer**: 0 minutos (configurable)

## 🛠️ Testing Local

Antes de push, ejecutar:

```bash
# Linux/Mac
./scripts/test-ci-local.sh

# Windows
.\scripts\test-ci-local.ps1
```

Simula todos los checks del CI localmente.

## 📊 Performance

### Tiempos Estimados

| Workflow | Duración Típica |
|----------|----------------|
| CI Pipeline | 3-5 minutos |
| PR Checks | 1-2 minutos |
| Security Scan | 5-10 minutos |
| CD Pipeline | 5-8 minutos |

### Optimizaciones Aplicadas

- ✅ npm cache (reduce install time ~60%)
- ✅ Jobs paralelos (reduce total time ~40%)
- ✅ npm ci en vez de npm install (más rápido)
- ✅ Artifacts compartidos entre jobs
- ✅ Conditional execution (skip unnecessary jobs)

## 🔄 Flujo de Trabajo Completo

### Feature Development

```bash
1. git checkout -b feature/nueva-funcionalidad
2. # Desarrollar cambios
3. ./scripts/test-ci-local.sh  # Verificar localmente
4. git add . && git commit -m "feat: descripción"
5. git push origin feature/nueva-funcionalidad
6. # Crear PR en GitHub
7. # PR Checks se ejecutan automáticamente
8. # Code review + aprobar PR
9. git merge (o merge via GitHub)
10. # CD Pipeline despliega a producción
```

### Hotfix Flow

```bash
1. git checkout -b hotfix/issue-critical
2. # Fix crítico
3. ./scripts/test-ci-local.sh
4. git commit -m "fix: descripción urgente"
5. git push origin hotfix/issue-critical
6. # PR con fast review
7. Merge a main
8. # Deploy automático
```

## 📚 Referencias

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [npm ci Documentation](https://docs.npmjs.com/cli/v8/commands/npm-ci)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
