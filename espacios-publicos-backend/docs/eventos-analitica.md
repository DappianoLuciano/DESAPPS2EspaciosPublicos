# Eventos para Analitica

## `com.citypass.espacios.ActividadModificada`

Se publica al cancelar un evento comunitario (`PATCH /api/community-events/:id/cancel`), desde
`CancelCommunityEventUseCase`. El FQN se puede sobrescribir con `ACTIVITY_MODIFIED_EVENT_FQN`.

**Convive con `EventoCancelado`** (CU-INT-01): ese evento no cambia y se sigue publicando primero.
Los dos se guardan en `event_outbox` y se publican por el bus, asi que los reintentos los maneja el
outbox (ver `eventos-cu-int-01.md`). Comparten el instante de la cancelacion, pero cada uno tiene su
propio id de evento.

| Campo | Tipo Avro | Origen |
| --- | --- | --- |
| `correlationId` | `string` | `"act-" + actividadId` |
| `actividadId` | `string` | id del evento comunitario |
| `estadoAnterior` | `string` | estado antes de cancelar, mapeado |
| `estadoNuevo` | `string` | `PROGRAMADA`, `SUSPENDIDA` o `CANCELADA`; hoy siempre `CANCELADA` |
| `motivo` | `["null","string"]`, default `null` | `reason` del body, igual que en `EventoCancelado` |
| `causaId` | `["null","string"]`, default `null` | `causaId` del body |
| `causaTipo` | `["null","string"]`, default `null` | `causaTipo` del body: `EVENTO_CLIMATICO`, `RECLAMO` o `INCIDENTE_VIAL` |
| `modificadaEn` | `long` (`timestamp-millis`) | momento de la cancelacion (`date.getTime()`, no ISO) |
| `actorSub` | `["null","string"]`, default `null` | `sub` del token de quien cancela |

### Mapeo de estados

| `CommunityEvent.status` | Estado en el contrato |
| --- | --- |
| `ACTIVE` | `PROGRAMADA` |
| `ACTIVE_FULL` | `PROGRAMADA` |
| `SUSPENDED` | `SUSPENDIDA` |
| `CANCELLED` | `CANCELADA` |

El mapeo es un `Record` exhaustivo: si se agrega un estado a `CommunityEventStatus`, el codigo no
compila hasta sumarlo.

### Causa

El endpoint acepta `causaTipo` y `causaId` opcionales en el body:

- Van los dos o ninguno. Un valor vacio o en blanco cuenta como ausente.
- `causaTipo` tiene que ser uno de los tres valores exactos y `causaId` es texto de hasta 128 caracteres.
- Si no se cumple, responde 400 (`ValidationError`) y el evento no se cancela.
- Sin causa, los dos campos viajan en `null`.
- `causaId` no se valida contra otro modulo: el backend no verifica que la alerta, el reclamo o el
  incidente existan.
- `actorSub` lo completa el controller con `request.user.id`. El cliente no lo puede mandar: la ruta
  rechaza con 400 cualquier campo que no sea `reason`, `causaTipo` o `causaId`.

En el panel de administracion, con el tipo `EVENTO_CLIMATICO` se ofrece un selector con las alertas
`CONFIRMED` cuya `validUntil` todavia no paso, incluidas las que aun no empezaron, porque una
cancelacion suele ser preventiva. Si no hay alertas o la lista falla, se muestra un campo de texto.

## `categoria` en `ActividadCreada`

`ActividadCreada` suma `categoria` (`["null","string"]`, default `null`) al final del record. Lleva
`communityEvent.category` tal cual se cargo. Ver `eventos-squad-3.md`.

## `com.citypass.espacios.EspacioPublicoAfectado`

Pedido por Analitica para graficar los espacios afectados. Sale cada vez que un espacio queda cerrado,
restringido o con uso parcial. Lo arma `buildPublicSpaceAffectedPayload`
(`src/application/events/publicSpaceAffected.ts`) y pasa por el outbox como el resto.

| Campo | Tipo Avro | Origen |
| --- | --- | --- |
| `afectacionId` | `string` (UUID) | id de la restriccion climatica, o uno nuevo |
| `espacioId` | `string` | id del espacio |
| `categoria` | `["null","string"]` | `PLAZA`, `SALON`, `CANCHA` o `AUDITORIO`; `null` si el espacio no la tiene cargada |
| `latitud` / `longitud` | `["null","double"]` | coordenadas del espacio |
| `tipoAfectacion` | `string` | `CERRADO`, `USO_PARCIAL` o `ACCESO_RESTRINGIDO` |
| `afectacionDesde` | `long` (`timestamp-millis`) | inicio de la afectacion |
| `afectacionHastaEstimada` | `["null", long timestamp-millis]` | fin previsto; `null` si no se conoce |
| `causaId` / `causaTipo` | `["null","string"]` | ver tabla de fuentes |
| `correlationId` | `string` | `afectacion-<afectacionId>` |
| `occurredAt` | `long` (`timestamp-millis`) | momento en que se publico |

### Fuentes

| Hecho | `tipoAfectacion` | `causaTipo` / `causaId` | `afectacionHastaEstimada` |
| --- | --- | --- | --- |
| Se aplica una medida climatica a un espacio (`POST /api/admin/weather-alerts/:id/restrictions`) | `ACCESO_RESTRINGIDO` | `EVENTO_CLIMATICO` / id de la alerta | fin de la medida (`validUntil`) |
| Un administrador deshabilita el espacio (`DISABLED`) | `CERRADO` | `null` / `null` | `null` |
| Movilidad publica `MovilidadObstruccionEvaluada` a 1000 m o menos de un espacio habilitado | `ACCESO_RESTRINGIDO` (`USO_PARCIAL` si `impactoCirculacion` es bajo y no requiere intervencion inmediata) | `INCIDENTE_VIAL` / `reclamoId` | `null` |
| Llega un `ReclamoReclasificado` que pasa a `afectaCirculacionNueva = true`, a 1000 m o menos | `USO_PARCIAL` | `RECLAMO` / `reclamoId` | `null` |
| Llega un `ReclamoCreado` con `afectaCirculacion` y coordenadas (el schema registrado hoy no las trae) | `USO_PARCIAL` | `RECLAMO` / `reclamoId` | `null` |

- `EVENTO_CLIMATICO` no estaba en la lista original de Analitica: es la unica causa que hoy restringe
  espacios, asi que se sumo al mismo enum que usa `ActividadModificada`.
- `INCIDENTE_VIAL` sale de las obstrucciones que evalua Movilidad. Analitica mide
  `ACCESO_RESTRINGIDO` + `INCIDENTE_VIAL`.
- `impactoCirculacion` no tiene valores documentados: `NINGUNO`/`SIN_IMPACTO` se ignora,
  `BAJO`/`LEVE` va como `USO_PARCIAL` y cualquier otro valor como `ACCESO_RESTRINGIDO`. Ajustar cuando
  Movilidad confirme la lista.
- Para las afectaciones que vienen de un reclamo, `afectacionId` es estable (UUID v5 de causa + reclamo +
  espacio): una reevaluacion del mismo reclamo repite el id.
- Las emergencias no generan afectaciones.
- Volver a aplicar la misma alerta a un espacio que ya la tenia no publica de nuevo.
- No hay evento de fin de afectacion: el grafico usa `afectacionHastaEstimada` cuando existe.
- La categoria se carga en el alta y la edicion del espacio (migracion `20261105230000_public_space_category`).
  Los espacios ya cargados quedan en `null` hasta que se complete.

## Puesta en marcha

Registrar los contratos **antes** de desplegar el backend; si no, el gateway no conoce
`ActividadModificada` ni el campo `categoria`:

```bash
npm run eda:register-events -- --update-compatible
```

- `ActividadModificada` es nuevo y se registra sin ese flag.
- `ActividadCreada` ya esta registrado: sin `--update-compatible`, el script corta con "El esquema
  registrado difiere del local" y deja de procesar los contratos que siguen.
- Quienes consuman `ActividadModificada` necesitan su propia suscripcion en el gateway.
