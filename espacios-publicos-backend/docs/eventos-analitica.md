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
