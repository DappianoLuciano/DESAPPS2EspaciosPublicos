# syntax=docker/dockerfile:1

# ---- builder: instala deps completas, genera el cliente Prisma y compila TypeScript ----
FROM node:20-slim AS builder
WORKDIR /app

# openssl es requerido por el query engine de Prisma en Debian.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# El script "postinstall" corre "prisma generate" durante "npm ci", asi que el
# schema tiene que estar copiado antes de instalar dependencias.
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

# "npm run build" corre "prisma generate && tsc" (ver package.json).
RUN npm run build

# Deja node_modules listo para produccion sin perder el cliente Prisma ya generado.
RUN npm prune --omit=dev

# ---- runtime: solo lo necesario para correr dist/server.js ----
FROM node:20-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system nodeapp \
    && useradd --system --gid nodeapp --home-dir /app --shell /usr/sbin/nologin nodeapp

ENV NODE_ENV=production
ARG PORT=3000
ENV PORT=${PORT}

COPY --from=builder --chown=nodeapp:nodeapp /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodeapp /app/dist ./dist
COPY --from=builder --chown=nodeapp:nodeapp /app/prisma ./prisma
COPY --chown=nodeapp:nodeapp package.json ./

USER nodeapp

EXPOSE ${PORT}

# El middleware requireHttps del backend exige HTTPS en modo production (ver
# src/interfaces/http/middlewares/httpSecurity.ts). Como este healthcheck corre
# dentro del propio contenedor (sin pasar por el proxy TLS), se declara
# explicitamente el origen como https via X-Forwarded-Proto: la app confia en el
# primer hop porque "trust proxy" esta habilitado en produccion.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS -H "X-Forwarded-Proto: https" "http://127.0.0.1:${PORT}/health" || exit 1

# NOTA: package.json declara "main"/"start" como "dist/server.js", pero
# tsconfig.json tiene "rootDir": "." (para poder incluir tambien tests/ y
# api/ en el mismo build), asi que tsc en realidad emite a "dist/src/server.js".
# Se usa el path real, verificado contra el output de "npm run build".
CMD ["node", "dist/src/server.js"]
