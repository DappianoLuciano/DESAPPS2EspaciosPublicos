# Migraciones de base de datos

El backend usa Prisma + PostgreSQL. Cada cambio en `prisma/schema.prisma` debe quedar acompañado por una migracion dentro de `prisma/migrations`.

## Flujo recomendado

Cuando alguien baja cambios del repo:

```bash
cd espacios-publicos-backend
docker compose up -d
npm run prisma:migrate
```

Para revisar el estado:

```bash
npm run prisma:status
```

Para abrir la base visualmente:

```bash
npm run prisma:studio
```

## Si aparece un error por campos nuevos

Ejemplo: agregamos `zone` a `PublicSpace`, pero tu base local todavia no tiene esa columna.

Solucion:

```bash
npm run prisma:migrate
```

Si la API detecta una tabla o columna faltante, devuelve un mensaje indicando que la base local no esta sincronizada, en lugar de responder solamente `Error interno del servidor`.

## Regla del equipo

- Cambios de modelo compartidos: usar migraciones.
- Pruebas rapidas locales: `npm run prisma:push` puede servir, pero no reemplaza una migracion versionada.
- No subir `.env`, dumps de base de datos ni credenciales reales.
