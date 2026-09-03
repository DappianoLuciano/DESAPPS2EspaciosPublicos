# Pipeline CI/CD - Guía de Inicio Rápido

Esta guía te ayudará a configurar el pipeline CI/CD en menos de 10 minutos.

## 🚀 Paso 1: Verificar que todo funciona localmente

Antes de configurar GitHub Actions, asegúrate de que el proyecto compila sin errores:

### Windows (PowerShell)
```powershell
.\scripts\test-ci-local.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x scripts/test-ci-local.sh
./scripts/test-ci-local.sh
```

Este script simula los checks que correrán en GitHub Actions. Si hay errores, corrígelos antes de continuar.

## 📝 Paso 2: Actualizar los badges en README.md

Edita `README.md` y reemplaza `USUARIO/REPO` con tu usuario y nombre de repositorio de GitHub:

```markdown
[![CI Pipeline](https://github.com/TU-USUARIO/TU-REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/TU-USUARIO/TU-REPO/actions/workflows/ci.yml)
```

Ejemplo:
```markdown
[![CI Pipeline](https://github.com/johndoe/citypass-espacios/actions/workflows/ci.yml/badge.svg)](https://github.com/johndoe/citypass-espacios/actions/workflows/ci.yml)
```

## 🔐 Paso 3: Configurar Secrets (Opcional para CI básico)

El CI básico funciona sin secrets, pero para deployment necesitas configurarlos:

1. Ve a tu repositorio en GitHub
2. `Settings` > `Secrets and variables` > `Actions`
3. Click en `New repository secret`
4. Agrega estos secrets:

### Secrets mínimos para deployment:

| Secret | Descripción | Dónde obtenerlo |
|--------|-------------|-----------------|
| `DATABASE_URL` | URL de PostgreSQL producción | Tu proveedor de BD |
| `VITE_API_URL` | URL de tu API | Tu dominio/IP |

### Secrets opcionales (según plataforma de deployment):

**Para Railway:**
- `RAILWAY_TOKEN` - Token de Railway CLI

**Para Vercel:**
- `VERCEL_TOKEN` - Token de Vercel
- `VERCEL_ORG_ID` - ID de organización
- `VERCEL_PROJECT_ID` - ID del proyecto

## ⚙️ Paso 4: Habilitar GitHub Actions

1. Ve a `Settings` > `Actions` > `General`
2. En "Actions permissions", selecciona:
   - ✅ `Allow all actions and reusable workflows`
3. Click `Save`

## 🎯 Paso 5: Push y verificar

```bash
git add .
git commit -m "ci: add GitHub Actions pipeline"
git push origin main
```

Luego ve a la pestaña `Actions` en GitHub para ver el pipeline en ejecución.

## ✅ Verificación

El pipeline está funcionando correctamente cuando:

1. ✅ Los badges en README.md muestran "passing" (verde)
2. ✅ En la pestaña `Actions` ves workflows ejecutándose o completados
3. ✅ Los PRs nuevos muestran checks automáticos

## 🔧 Troubleshooting Rápido

### "CI no se ejecuta"
- Verifica que GitHub Actions esté habilitado (Paso 4)
- Verifica que los archivos `.github/workflows/*.yml` existan en la branch

### "CI falla en Prisma Generate"
- Asegúrate de que `prisma/schema.prisma` existe en el backend
- El schema debe ser válido (prueba `npm run prisma:generate` localmente)

### "CI falla en tests"
- Ejecuta `npm test` en el backend localmente
- Si los tests necesitan BD, considera mockear o usar una BD de test

### "Badge muestra 'unknown'"
- Espera a que el primer workflow se complete
- Verifica que reemplazaste `USUARIO/REPO` con los valores correctos

## 📚 Próximos Pasos

1. **Configurar deployment automático:**
   - Lee [PIPELINE.md](.github/PIPELINE.md) sección "CD Pipeline"
   - Configura los secrets de tu plataforma (Railway/Vercel)
   - Habilita deployment con las variables `DEPLOY_BACKEND=true` y `DEPLOY_FRONTEND=true`

2. **Configurar Dependabot:**
   - Edita `.github/dependabot.yml`
   - Reemplaza `TU-USUARIO` con tu usuario de GitHub
   - Dependabot creará PRs automáticos para actualizar dependencias

3. **Personalizar checks:**
   - Edita `.github/workflows/pr-checks.yml` para añadir más validaciones
   - Agrega tests E2E o de integración
   - Configura Code Quality tools (SonarCloud, etc.)

## 🆘 Ayuda

Si necesitas ayuda:
1. Revisa [PIPELINE.md](.github/PIPELINE.md) para documentación completa
2. Verifica los logs en la pestaña `Actions` de GitHub
3. Busca el error específico en la documentación de GitHub Actions

## 🎉 ¡Listo!

Ahora tienes un pipeline CI/CD funcional que:
- ✅ Ejecuta tests automáticamente
- ✅ Valida el código en cada PR
- ✅ Hace build de ambos proyectos
- ✅ Está listo para deployment automático

Para deployment, continúa con la [guía completa](.github/PIPELINE.md).
