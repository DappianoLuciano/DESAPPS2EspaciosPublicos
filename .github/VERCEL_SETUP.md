# Configuración de Vercel

Este documento describe cómo están (y deben estar) configurados los proyectos
de Vercel del monorepo, y documenta el incidente de producción de septiembre
2026 para que no se repita sin dejar rastro de la causa.

## 🚀 Cómo se despliega este proyecto

El deploy a producción **no pasa por GitHub Actions**. Se hace con la
**integración nativa de Vercel** (la GitHub App de Vercel, instalada sobre
este repositorio): cada push a `main` dispara un deploy a producción, y cada
push a cualquier otra rama o Pull Request dispara un deploy de *preview*,
automáticamente, sin ningún workflow de por medio.

El repo tiene un `cd.yml` alternativo en `.github/workflows/` que despliega
vía Vercel CLI desde GitHub Actions, pero **su disparo automático está
deshabilitado a propósito** (solo corre manualmente, `workflow_dispatch`).
No se decidió usarlo porque:
- La integración nativa ya funciona sin necesitar cargar ningún secret en
  este repo.
- Tenerlos a los dos corriendo a la vez generaría dos mecanismos de deploy
  compitiendo entre sí.

Si en algún momento el equipo decide migrar a ese pipeline en su lugar, hay
que: (1) cargar los secrets que están documentados como comentario al final
de `cd.yml`, y (2) desactivar el auto-deploy nativo en **Settings → Git** de
cada proyecto en Vercel, para que no queden los dos activos.

## 📦 Proyectos en Vercel

Hay tres proyectos en el team `dappiano-luciano-s-projects`:

| Proyecto | Qué es | Root Directory |
|---|---|---|
| `espacios-publicos-backend` | API Express (función serverless) | `espacios-publicos-backend` |
| `espacios-publicos-frontend` | SPA de React/Vite | `espacios-publicos-frontend` |
| `desapps-2-espacios-publicos` | Sin identificar todavía | — |

⚠️ **`desapps-2-espacios-publicos` quedó sin investigar.** No sabemos si es
un proyecto legacy, un duplicado de alguno de los otros dos, o algo activo.
Antes de tocarlo o borrarlo, alguien con acceso debería revisar **Settings →
Git** (a qué repo/rama apunta) y **Settings → Domains** (si tiene un dominio
real asignado en uso).

## ⚙️ Configuración correcta por proyecto

### `espacios-publicos-backend`

| Setting (Settings → General → Build & Development Settings) | Valor |
|---|---|
| Root Directory | `espacios-publicos-backend` |
| Framework Preset | **Other** (no "Express" — ver incidente más abajo) |
| Build Command (override) | `mkdir -p public && echo "ok" > public/index.html` |
| Output Directory | `public` (el default; el comando de arriba es lo que lo deja no-vacío) |
| Node.js Version | 24.x |

El backend se sirve como función serverless a partir de
`espacios-publicos-backend/api/index.ts` (que exporta la app de Express
directo). Vercel empaqueta esa función con `@vercel/node`, **sin necesitar
ningún build real** — por eso el Build Command de arriba es un no-op: solo
existe para satisfacer el chequeo de Vercel de que exista un Output
Directory no vacío, no porque el proyecto genere contenido estático.

### `espacios-publicos-frontend`

| Setting | Valor |
|---|---|
| Root Directory | `espacios-publicos-frontend` |
| Framework Preset | **Vite** |
| Build Command | default (`npm run build`) |
| Output Directory | default (`dist`) |
| Node.js Version | 24.x |

### Variables de entorno (ambos proyectos)

Cargar cada variable relevante en **Production y también en Preview** —
si falta en Preview, los deploys de preview (por PR o por rama) fallan
aunque producción esté perfecta. Esto ya nos pasó con `VITE_API_URL`.

**Backend** (mismas variables que `espacios-publicos-backend/.env.example`):
`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_EVENT_IMAGES_BUCKET`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`,
`JWT_SECRET`, `LOG_LEVEL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`FRONTEND_URL`.

**Frontend** (mismas variables que `espacios-publicos-frontend/.env.example`):
`VITE_API_URL` (debe ser la URL real de producción del backend, `https://`),
`VITE_GOOGLE_CLIENT_ID`.

## 🔥 Incidente de septiembre 2026 (para referencia)

**Síntoma:** los deploys de `espacios-publicos-backend` y
`espacios-publicos-frontend` fallaban en Vercel para cualquier commit, sin
relación con el contenido del cambio. Estuvo así roto varios días antes de
detectarse, porque nadie con acceso de owner a Vercel estaba revisándolo.

**Cómo se diagnosticó sin acceso a Vercel:** el estado pass/fail de cada
deploy es público vía la API de GitHub (sin necesitar login a Vercel):

```bash
curl -s https://api.github.com/repos/DappianoLuciano/DESAPPS2EspaciosPublicos/commits/<sha>/status
```

Eso permitió confirmar que el fallo era anterior a cualquier cambio de
código nuestro (fallaba igual en commits de varios días antes), antes de
conseguir acceso real al dashboard.

**Causas reales (dos, una por proyecto), encontradas recién con acceso al
dashboard y al log de build:**

1. **Backend:** `Root Directory` estaba en `./` (la raíz del repo) en vez de
   `espacios-publicos-backend`, combinado con `Framework Preset: Express`
   aplicado sobre un setup manual de función serverless. Producía un crash
   interno del CLI de Vercel (`Cannot read properties of undefined (reading
   'fsPath')`) antes de siquiera intentar instalar dependencias.
2. **Frontend:** mismo problema de `Root Directory` en `./`. Con el install
   corriendo en la raíz del repo (donde no hay ningún `package.json`), nunca
   se instalaba nada de verdad, y `vite build` fallaba con
   `vite: command not found` (exit 127).

**Por qué no se detectó por el contenido del build log al toque:** el error
del backend era un mensaje interno del CLI sin stack trace ni referencia al
Root Directory, así que la primera hipótesis (build cache corrupto) fue
descartada recién al reproducir el mismo error con "Redeploy sin cache".
Recién ahí se revisó `Root Directory`/`Framework Preset` en Settings y
apareció la causa real.

**Moraleja:** si un deploy de Vercel empieza a fallar igual sin importar el
commit, sospechar primero de la configuración del proyecto en el dashboard
(Root Directory, Framework Preset, Build Command, variables de entorno por
ambiente) antes que del código — esa configuración no vive en el repo, no
se versiona, y nadie la ve a menos que entre a Vercel a revisarla.
