# Eventos del squad 3: recoleccion inteligente despues de un evento masivo

## E1 `com.citypass.espacios.ActividadCreada`

Se publica cada vez que se crea un evento comunitario (`POST /api/community-events`), desde
`CreateCommunityEventUseCase`. El FQN se puede sobrescribir con `ACTIVITY_CREATED_EVENT_FQN`.

**Convive con `EventoComunitarioPublicado`** (CU-INT-01, lo consume Residuos): ese evento no cambia.
Al crear un evento comunitario se publican los dos, primero `EventoComunitarioPublicado` y despues
`ActividadCreada`. Los dos siguen el mismo patron: se guardan en `event_outbox` y se publican por el
bus, asi que los reintentos los maneja el outbox (ver `eventos-cu-int-01.md`).

| Campo | Tipo Avro | Origen |
| --- | --- | --- |
| `correlationId` | `["null","string"]`, default `null` | `"act-" + actividadId` (siempre se envia; es opcional en el esquema porque se agrego despues de registrar el contrato) |
| `actividadId` | `string` | id del evento comunitario |
| `titulo` | `string` | titulo del evento |
| `estado` | `string` | siempre `"PROGRAMADA"` |
| `capacidad` | `int` | cupo del evento |
| `fechaHoraInicio` | `long` (`timestamp-millis`) | inicio del evento (`date.getTime()`, no ISO) |
| `fechaHoraFinalizacion` | `long` (`timestamp-millis`) | fin del evento (`date.getTime()`, no ISO) |
| `ubicacion` | `record Ubicacion { lat: double, lng: double }` | coordenadas del espacio publico |
| `direccion` | `string` | direccion del espacio |
| `espacioNombre` | `string` | nombre del espacio |
| `actorSub` | `["null","string"]`, default `null` | `sub` del token del organizador |
| `categoria` | `["null","string"]`, default `null` | categoria del evento tal cual se cargo (`communityEvent.category`, texto de `EVENT_CATEGORIES` del frontend; no se mapea a otro enum) |
| `organizadorTipo` | `string` (obligatorio) | `CIUDAD` si lo crea un `municipal_admin`, `CIUDADANO` si no. Lo completa el controller con el rol del token |
| `masivo` | `["null","boolean"]`, default `null` | `true` si `capacidad >= 1000` (`MASIVO_UMBRAL`, exportada desde el use case) |
| `tipoActividad` | `["null","string"]`, default `null` | `CULTURAL`, `DEPORTIVO` o `RECREATIVO`, mapeado desde `categoria` con `mapCategoriaToTipoActividad`; `null` si la categoria no se reconoce |
| `espacioId` | `["null","string"]`, default `null` | id del espacio publico (`communityEvent.publicSpaceId`) |
| `organizadorId` | `["null","string"]`, default `null` | mismo valor que `actorSub` |
| `createdAt` | `["null","string"]`, default `null` | alta del evento, ISO-8601 en UTC (`2026-11-20T15:00:00.000Z`) |

- El payload lo arma `buildActivityCreatedPayload` (exportada desde el use case).
- `actorSub` lo completa el controller con `request.user.id`; el cliente no lo puede mandar en el body.
- La ubicacion siempre esta: el use case ya rechaza espacios sin coordenadas.
- El contrato se registra en el gateway con `npm run eda:register-events`. Para sumar `categoria` a un
  contrato ya registrado hace falta `--update-compatible` (ver `eventos-analitica.md`).
- Registrado el 05/11/2026: el gateway tomo el cambio como breaking y creo la **version 2**
  (schemaId 61, topico `com.citypass.espacios.ActividadCreada.v2`). La v1 (schemaId 60, topico
  `com.citypass.espacios.ActividadCreada`) no tenia suscripciones. Quien consuma `ActividadCreada`
  tiene que suscribirse a la v2.
- **Version 3** (schemaId 91, topico `com.citypass.espacios.ActividadCreada.v3`): suma `organizadorTipo`
  obligatorio, pedido por Analitica. Desde que se registro, el gateway rechaza con 400 cualquier
  `ActividadCreada` sin ese campo. Quien consuma `ActividadCreada` tiene que suscribirse a la v3.
- **Contrato Parte 2 de Analitica**: suma `masivo`, `tipoActividad`, `espacioId`, `organizadorId` y
  `createdAt` al final del record, todos `["null", tipo]` con default `null`, asi que la evolucion es
  compatible y ningun campo existente cambia de nombre ni de formato (las fechas `timestamp-millis` quedan
  igual). El codigo los manda siempre. Se registra con `npm run eda:register-events -- --update-compatible`.
  Si el gateway lo toma como una version nueva y crea un topico `.vN`, los consumidores tienen que
  suscribirse a esa version.

### Mapeo de `categoria` a `tipoActividad`

`mapCategoriaToTipoActividad` (`src/domain/services/tipoActividad.ts`) compara sin mayusculas ni tildes:

| `categoria` | `tipoActividad` |
| --- | --- |
| Juegos, Infancias, Gastronomía | `RECREATIVO` |
| Cultura, Música, Arte, Tecnología, Ciencia, Teatro, Danza, Literatura, Cine, Charlas, Talleres | `CULTURAL` |
| desconocida o `null` | `null` |

Hoy ninguna categoria es deportiva, asi que no sale `DEPORTIVO`. El mapeo es un `Record` exhaustivo sobre
las categorias de `EVENT_CATEGORIES` del frontend: un test compara las dos listas, y sumar una categoria
obliga a decidir su tipo.

## Demo

`prisma/seed.js` agrega el espacio **Plaza Houssay** (`seed-space-plaza-houssay`, Av. Córdoba 2100,
Recoleta, capacidad 6000, `OUTDOOR`, -34.5994 / -58.3988) para crear un festival de 5.000 personas.
