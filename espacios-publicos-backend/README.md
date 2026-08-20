# CityPass+ - Espacios Publicos y Cultura

Backend inicial para gestionar espacios publicos, reservas y eventos comunitarios.

La estrategia sigue el documento base: primero se construye el backend principal, luego el frontend y despues se agregan eventos con un broker real. En este Sprint 1 el proyecto usa un `EventBus` propio con implementacion en consola/memoria para aprender el flujo EDA sin sumar Kafka o RabbitMQ demasiado pronto.

## Stack

- Node.js + Express + TypeScript
- Prisma + PostgreSQL
- EventBus propio preparado para reemplazar por RabbitMQ o Kafka
- Jest + Supertest para pruebas
- Docker Compose para levantar PostgreSQL local

## Arquitectura

- `domain`: entidades, contratos de repositorios y servicios del negocio.
- `application`: casos de uso que coordinan reglas, persistencia y eventos.
- `infrastructure`: implementaciones concretas, como Prisma y EventBus en consola.
- `interfaces/http`: controladores, rutas y middlewares de Express.

## Primer hito

- Crear espacios publicos.
- Listar espacios publicos.
- Solicitar reservas evitando superposiciones.
- Listar reservas.
- Crear eventos comunitarios.
- Listar agenda cultural.
- Registrar eventos de dominio en `event_outbox`.

## Comandos

```bash
cd espacios-publicos-backend
npm install
cp .env.example .env
docker compose up -d
npm run prisma:migrate
npm run dev
```

Para pruebas:

```bash
npm test
```

## Eventos de dominio previstos

- `espacios.reserva_confirmada`
- `cultura.evento_comunitario_publicado`

Mas adelante, la interfaz `EventBus` permite cambiar la implementacion actual por RabbitMQ, Kafka u otro broker sin reescribir los casos de uso.
