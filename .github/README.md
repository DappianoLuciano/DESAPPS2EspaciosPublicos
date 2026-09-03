# Pipeline CI/CD - Índice de Documentación

Este directorio contiene toda la configuración del pipeline CI/CD para el proyecto CityPass+ Espacios Públicos.

## 📁 Estructura de Archivos

```
.github/
├── workflows/              # GitHub Actions workflows
│   ├── ci.yml             # Pipeline de integración continua
│   ├── cd.yml             # Pipeline de deployment continuo
│   ├── pr-checks.yml      # Validaciones automáticas de PRs
│   └── security.yml       # Scans de seguridad semanales
│
├── dependabot.yml         # Configuración de actualizaciones automáticas
│
└── docs/                  # Documentación
    ├── QUICKSTART.md      # ⭐ Inicio rápido (empieza aquí)
    ├── PIPELINE.md        # Guía completa de configuración
    └── ARCHITECTURE.md    # Arquitectura técnica detallada
```

## 🚀 Por Donde Empezar

### Para Desarrolladores

1. **Primera vez configurando el pipeline:**
   - Lee [QUICKSTART.md](QUICKSTART.md) (5-10 minutos)
   - Ejecuta `./scripts/test-ci-local.sh` antes de hacer push
   - Haz tu primer PR y observa los checks automáticos

2. **Uso diario:**
   - Haz tus commits con [conventional commits](https://www.conventionalcommits.org/)
   - Ejecuta tests locales con el script antes de push
   - Los PRs se validan automáticamente

3. **Troubleshooting:**
   - Revisa los logs en la pestaña `Actions` de GitHub
   - Consulta la sección "Troubleshooting" en [PIPELINE.md](PIPELINE.md)

### Para DevOps/Administradores

1. **Configuración inicial:**
   - Lee [PIPELINE.md](PIPELINE.md) completo
   - Configura secrets en GitHub Settings
   - Habilita o deshabilita deployment automático

2. **Arquitectura y flujos:**
   - Lee [ARCHITECTURE.md](ARCHITECTURE.md)
   - Entiende los diagramas de flujo
   - Personaliza workflows según necesidades

## 📚 Guías por Tarea

### Quiero entender cómo funciona todo
→ [ARCHITECTURE.md](ARCHITECTURE.md) - Diagramas y explicación técnica

### Quiero configurar el pipeline por primera vez
→ [QUICKSTART.md](QUICKSTART.md) - Setup paso a paso en <10 minutos

### Quiero configurar deployment automático
→ [PIPELINE.md](PIPELINE.md) - Sección "CD Pipeline"

### Quiero testear antes de hacer push
→ Ejecutar `./scripts/test-ci-local.sh` (Linux/Mac) o `.\scripts\test-ci-local.ps1` (Windows)

### Quiero actualizar dependencias automáticamente
→ [PIPELINE.md](PIPELINE.md) - Sección "Dependabot"

### Quiero añadir más checks al pipeline
→ Editar `.github/workflows/pr-checks.yml` o `ci.yml`

### El pipeline falló y no sé por qué
→ [PIPELINE.md](PIPELINE.md) - Sección "Troubleshooting"

## 🔄 Workflows Disponibles

### CI Pipeline (`ci.yml`)
**Trigger:** Push o PR a `main` o `develop`

**Qué hace:**
- ✅ Instala dependencias (backend + frontend)
- ✅ Genera Prisma Client
- ✅ Ejecuta tests (backend)
- ✅ Ejecuta linter (frontend)
- ✅ Hace build de ambos proyectos
- ✅ Sube artifacts para debugging

**Duración:** ~3-5 minutos

---

### CD Pipeline (`cd.yml`)
**Trigger:** Push a `main` (o manual)

**Qué hace:**
- 🚀 Despliega backend a Railway (si habilitado)
- 🚀 Despliega frontend a Vercel (si habilitado)
- 🗄️ Ejecuta migraciones de BD (si habilitado)
- 🏥 Health checks post-deployment

**Duración:** ~5-8 minutos

**Estado:** ⚠️ Requiere configuración de secrets

---

### PR Checks (`pr-checks.yml`)
**Trigger:** Pull Request creado/actualizado

**Qué hace:**
- ✅ Valida título del PR (conventional commits)
- ✅ Detecta merge conflicts
- ✅ Detecta archivos sensibles (.env)
- ✅ Detecta archivos grandes (>1MB)
- ✅ Busca console.log en código
- ✅ npm audit de dependencias
- ✅ Verifica tamaño del bundle (<10MB)

**Duración:** ~1-2 minutos

---

### Security Scan (`security.yml`)
**Trigger:** Lunes 9am (automático) o manual

**Qué hace:**
- 🔒 npm audit completo
- 🔒 Escanea secrets hardcodeados
- 🔒 CodeQL analysis para vulnerabilidades
- 🔒 Verifica que .env no está commiteado

**Duración:** ~5-10 minutos

---

### Dependabot (`dependabot.yml`)
**Trigger:** Lunes 9am (automático)

**Qué hace:**
- 📦 Crea PRs para actualizar dependencias
- 📦 Separa dev deps de prod deps
- 📦 Agrupa actualizaciones menores
- 📦 Máximo 5 PRs abiertos simultáneos

**Frecuencia:** Semanal (npm), Mensual (GitHub Actions)

## 🎯 Estados del Pipeline

### ✅ Todo funcionando
```
CI Pipeline:    ✅ passing
CD Pipeline:    ✅ passing
PR Checks:      ✅ passing
Security:       ✅ passing
```
→ Todo está bien, puedes hacer merge

### ⚠️ Warnings pero funcionando
```
CI Pipeline:    ✅ passing
PR Checks:      ⚠️ warnings
Security:       ⚠️ found issues
```
→ Revisa los warnings, pero no bloquea merge

### ❌ Bloqueado
```
CI Pipeline:    ❌ failing
```
→ No puedes hacer merge, hay que corregir

## 🔧 Customización

### Cambiar frecuencia de Dependabot
Editar `.github/dependabot.yml`:
```yaml
schedule:
  interval: "weekly"  # Cambiar a "daily" o "monthly"
  day: "monday"       # Día de la semana
```

### Añadir más validaciones a PRs
Editar `.github/workflows/pr-checks.yml`:
```yaml
- name: Mi nueva validación
  run: |
    # Tu script aquí
```

### Cambiar plataforma de deployment
Editar `.github/workflows/cd.yml` y comentar/descomentar secciones:
```yaml
# Railway (actual)
# Render (alternativa)
# Netlify (alternativa para frontend)
```

## 📊 Métricas

El pipeline trackea:
- ✅ Tasa de éxito de builds
- ✅ Tiempo promedio de ejecución
- ✅ Vulnerabilidades detectadas
- ✅ Dependencias outdated
- ✅ Tamaño del bundle

Ver en: GitHub → Actions → Insights

## 🆘 Soporte

### El pipeline falla
1. Ve a Actions → Click en el workflow fallido
2. Click en el job que falló
3. Revisa los logs rojos
4. Busca el error en [PIPELINE.md - Troubleshooting](PIPELINE.md#troubleshooting)

### Necesito ayuda para configurar
1. Lee [QUICKSTART.md](QUICKSTART.md) primero
2. Si persiste el problema, revisa [PIPELINE.md](PIPELINE.md)
3. Revisa los logs en Actions

### Quiero añadir nuevas features al pipeline
1. Lee [ARCHITECTURE.md](ARCHITECTURE.md) para entender la estructura
2. Edita el workflow correspondiente
3. Prueba con workflow_dispatch (ejecución manual) primero

## 🔗 Links Útiles

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)
- [Dependabot Docs](https://docs.github.com/en/code-security/dependabot)

## 📝 Changelog del Pipeline

### v1.0.0 (Actual)
- ✅ CI Pipeline completo (backend + frontend)
- ✅ CD Pipeline (Railway + Vercel)
- ✅ PR Checks automáticos
- ✅ Security scanning semanal
- ✅ Dependabot configurado
- ✅ Scripts de testing local
- ✅ Documentación completa

### Próximas mejoras sugeridas
- [ ] Tests E2E con Playwright
- [ ] Code coverage reporting
- [ ] Performance monitoring
- [ ] Notificaciones a Slack/Discord
- [ ] Rollback automático si health check falla

---

**Última actualización:** 2026-09-03
**Mantenedor:** Ver dependabot.yml para reviewers configurados
