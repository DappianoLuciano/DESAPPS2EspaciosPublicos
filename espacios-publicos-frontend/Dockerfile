# syntax=docker/dockerfile:1

# ---- builder: instala deps y genera el build estatico con Vite ----
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# "npm run build" corre "tsc -b && vite build". vite.config.ts exige que
# VITE_API_URL sea una URL https:// valida en build time (ver
# src/lib/api.ts y vite.config.ts), por eso estos valores se reciben como
# build args y no como variables de entorno en runtime: Vite los hornea en
# el bundle estatico durante "npm run build", el contenedor final solo sirve
# archivos y ya no lee variables de entorno.
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_ENABLE_MOCK_LOGIN
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID} \
    VITE_ENABLE_MOCK_LOGIN=${VITE_ENABLE_MOCK_LOGIN}

RUN npm run build

# ---- runtime: sirve el build estatico con nginx ----
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# La imagen base de nginx ya corre su proceso master como root para poder
# bindear el puerto y como "nginx" (no root) para los workers; no hace falta
# un USER adicional.

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
