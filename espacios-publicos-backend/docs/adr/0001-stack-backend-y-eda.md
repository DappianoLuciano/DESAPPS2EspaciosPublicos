# ADR 0001: Stack backend y estrategia EDA incremental

## Estado

Aceptado.

## Contexto

El modulo de Espacios Publicos y Cultura de CityPass+ debe gestionar espacios, reservas, eventos comunitarios e inscripciones. Tambien debe integrarse con otros modulos mediante eventos, pero el equipo esta en etapa de aprendizaje y necesita avanzar por hitos: backend, luego frontend, luego broker de eventos y pruebas mas completas.

El documento de justificacion original propone React + Vite + TypeScript, Node.js + Express + TypeScript, PostgreSQL administrado con Supabase, Prisma, Cloudinary, EventBus propio con broker futuro, Jest + Supertest y Docker Compose.

## Decision

Usaremos:

- **Node.js + Express + TypeScript** para el backend.
- **Prisma + PostgreSQL** para persistencia.
- **EventBus propio** como contrato de publicacion de eventos.
- **Implementacion en consola/memoria** del EventBus durante Sprint 1.
- **Tabla `event_outbox`** para registrar eventos de dominio antes de publicarlos.
- **Jest + Supertest** para pruebas de casos de uso y endpoints.
- **Docker Compose** para levantar PostgreSQL local.

El broker real, sea RabbitMQ, Kafka u otro, se agregara mas adelante sin cambiar los casos de uso principales.

## Alternativas consideradas

### Kafka desde Sprint 1

Ventajas:

- Muy usado en arquitecturas orientadas a eventos.
- Escala bien para flujos grandes y multiples consumidores.
- Permite historico de eventos y procesamiento distribuido.

Desventajas:

- Suma complejidad operativa temprana.
- Puede distraer del aprendizaje de dominio, capas y reglas de negocio.
- Requiere mas configuracion local y mas conocimiento para pruebas.

Motivo para no elegirlo ahora:

- El Sprint 1 necesita validar primero el modelo, los casos de uso y la publicacion conceptual de eventos.

### RabbitMQ desde Sprint 1

Ventajas:

- Mas simple de introducir que Kafka para mensajeria clasica.
- Buen soporte para colas, reintentos y consumidores.
- Adecuado para notificaciones y tareas asincronicas.

Desventajas:

- Igual agrega una dependencia operativa antes de tener el dominio estable.
- Obliga a configurar broker, conexiones y errores de red desde el inicio.

Motivo para no elegirlo ahora:

- Es una buena opcion futura, pero conviene incorporarla cuando el contrato `EventBus` ya este probado.

### Backend monolitico sin eventos

Ventajas:

- Es lo mas simple para empezar.
- Menos infraestructura y menos conceptos.

Desventajas:

- No prepara al modulo para comunicarse con otros equipos.
- Mezcla responsabilidades de negocio con notificaciones o integraciones.
- Se aleja del objetivo EDA del proyecto.

Motivo para no elegirlo:

- CityPass+ esta pensado como conjunto de modulos independientes. Necesitamos publicar hechos de dominio aunque el broker llegue despues.

## Consecuencias

Positivas:

- El codigo queda simple y entendible.
- Los casos de uso no dependen de Express, Prisma ni del broker.
- El equipo aprende EDA paso a paso.
- La tabla `event_outbox` deja trazabilidad desde el inicio.
- Cambiar de consola a RabbitMQ o Kafka queda contenido en infraestructura.

Negativas:

- La publicacion actual no garantiza entrega real a otros servicios.
- Falta implementar reintentos y consumidores.
- La consistencia transaccional completa entre persistencia y outbox queda como mejora posterior.

## Eventos iniciales

- `espacios.reserva_confirmada`
- `cultura.evento_comunitario_publicado`

## Proxima revision

Revisar este ADR cuando se implemente el broker real o cuando otro modulo necesite consumir eventos del modulo Espacios Publicos y Cultura.
