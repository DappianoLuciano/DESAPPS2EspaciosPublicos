# Eventos para Analitica

## `com.citypass.espacios.ActividadModificada`

Se publica cada vez que una actividad (evento comunitario) cambia de estado. El payload lo arma
`buildActivityModifiedPayload` (`src/application/events/activityModified.ts`). El FQN se puede
sobrescribir con `ACTIVITY_MODIFIED_EVENT_FQN`. Lo consumen Analitica y Reclamos: con `CANCELADA` o
`SUSPENDIDA`, Reclamos deja de relacionar reclamos nuevos de la zona con la actividad, y con
`PROGRAMADA` vuelve a hacerlo.

### Cuando se publica

| Accion | Origen | `estadoAnterior` → `estadoNuevo` | `motivo` | Causa |
| --- | --- | --- | --- | --- |
| Cancelar (`PATCH /api/community-events/:id/cancel`) | `CancelCommunityEventUseCase` | estado real → `CANCELADA` | `reason` del body | la del body (opcional, ver abajo) |
| Suspender a mano (`PATCH /:id/suspend`) | `ChangeCommunityEventSuspensionUseCase` | `PROGRAMADA` → `SUSPENDIDA` | `reason` del body | `null` |
| Reanudar a mano (`PATCH /:id/resume`) | `ChangeCommunityEventSuspensionUseCase` | `SUSPENDIDA` → `PROGRAMADA` | `null` | `null` |
| Aplicar medidas de una alerta (`POST /api/admin/weather-alerts/:id/restrictions`) | `PrismaWeatherRestrictionRepository.apply` | `PROGRAMADA` → `SUSPENDIDA` | `reason` de las medidas | `EVENTO_CLIMATICO` + id de la alerta |
| Levantar las medidas (`POST .../restrictions/release`) | `PrismaWeatherRestrictionRepository.release` | `SUSPENDIDA` → `PROGRAMADA` | `null` | `EVENTO_CLIMATICO` + id de la alerta |

**Solo cuando el estado cambia.** No se publica nada si la accion no cambia el estado de la actividad:

- Aplicar medidas a un evento que ya estaba suspendido por otra alerta (la medida se registra igual).
- Levantar medidas de un evento que sigue suspendido: por otra alerta todavia activa, porque el espacio
  esta deshabilitado, porque el evento ya termino o porque fue cancelado.
- Medidas que solo afectan espacios, sin eventos seleccionados.
- Una operacion rechazada (validacion, evento inexistente o estado cambiado mientras tanto).

En las medidas climaticas se publica un evento por actividad que cambio, todos con el mismo
`modificadaEn` (el instante de la operacion).

**Convive con otros eventos.** La cancelacion publica primero `EventoCancelado` (CU-INT-01), que no
cambia. La suspension y la reanudacion, manuales o por medidas, siguen publicando el snapshot de
`EventoComunitarioPublicado` para Movilidad. Cada evento tiene su propio id. El orden entre ellos no
esta garantizado (el bus no lo asegura) y los consumidores no lo asumen.

**Outbox.** Todos se guardan en `event_outbox` y se publican por el bus, asi que los reintentos los
maneja el outbox (ver `eventos-cu-int-01.md`):

- Cancelacion y suspension/reanudacion manual: se guarda la fila y se publica enseguida, como el resto
  de los casos de uso.
- Medidas climaticas: la fila se guarda dentro de la transaccion `Serializable` que cambia los estados
  (si la transaccion falla, no queda nada) y se publica en el bus despues del commit. Si esa
  publicacion falla, el worker del outbox la reintenta.

| Campo | Tipo Avro | Origen |
| --- | --- | --- |
| `correlationId` | `string` | `"act-" + actividadId` |
| `actividadId` | `string` | id del evento comunitario |
| `estadoAnterior` | `string` | estado real antes del cambio, mapeado |
| `estadoNuevo` | `string` | `PROGRAMADA`, `SUSPENDIDA` o `CANCELADA` |
| `motivo` | `["null","string"]`, default `null` | ver tabla de arriba |
| `causaId` | `["null","string"]`, default `null` | ver tabla de arriba |
| `causaTipo` | `["null","string"]`, default `null` | `EVENTO_CLIMATICO`, `RECLAMO` o `INCIDENTE_VIAL` |
| `modificadaEn` | `long` (`timestamp-millis`) | momento del cambio (`date.getTime()`, no ISO) |
| `actorSub` | `["null","string"]`, default `null` | `sub` del token del admin que hizo la accion; `null` si no hay |

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

**Automatica por alerta.** Cuando la suspension o la reanudacion vienen de las medidas de una alerta
climatica, la causa la pone el backend: `causaTipo = "EVENTO_CLIMATICO"` y `causaId` = id de la alerta
(el mismo `alertaId` de `CriticidadClimaticaConfirmada`). Es la misma alerta al suspender y al
reanudar, asi que se puede unir con ese id.

**Manual (suspender y reanudar).** Los endpoints `/suspend` y `/resume` no reciben causa: viaja en
`null`.

**Cancelacion.** El endpoint de cancelacion acepta `causaTipo` y `causaId` opcionales en el body:

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

**v2 (fechas ISO-8601).** Analitica pidio las fechas como texto ISO-8601 (`2026-11-20T15:00:00.000Z`,
siempre en UTC). Pasar de `long` a `string` es un cambio incompatible: EDA crea el topico
`com.citypass.espacios.EspacioPublicoAfectado.v2` y ahi se publica desde entonces. El
`metadata.eventType` del sobre sigue siendo `com.citypass.espacios.EspacioPublicoAfectado`. Para recibir
la v2, Analitica se tiene que suscribir al topico `.v2`.

| Campo | Tipo Avro | Origen |
| --- | --- | --- |
| `afectacionId` | `string` (UUID) | id de la restriccion climatica, o uno nuevo |
| `espacioId` | `string` | id del espacio |
| `categoria` | `["null","string"]` | `PLAZA`, `SALON`, `CANCHA` o `AUDITORIO`; `null` si el espacio no la tiene cargada |
| `latitud` / `longitud` | `["null","double"]` | coordenadas del espacio |
| `tipoAfectacion` | `string` | `CERRADO`, `USO_PARCIAL` o `ACCESO_RESTRINGIDO` |
| `afectacionDesde` | `string` (ISO-8601) | inicio de la afectacion |
| `afectacionHastaEstimada` | `["null","string"]` (ISO-8601) | fin previsto; `null` si no se conoce |
| `causaId` / `causaTipo` | `["null","string"]` | ver tabla de fuentes |
| `correlationId` | `string` | `afectacion-<afectacionId>` |
| `occurredAt` | `string` (ISO-8601) | momento en que se publico |

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
- La categoria se carga en el alta y la edicion del espacio (migracion `20261105230000_public_space_category`).
  Los espacios ya cargados quedan en `null` hasta que se complete.

## `com.citypass.espacios.EspacioPublicoRestaurado`

Termina una afectacion publicada antes. Lleva el mismo `afectacionId` y `correlationId` que el
`EspacioPublicoAfectado` que cierra, asi que la duracion es `restauradoAt - afectacionDesde`. Las
afectaciones vigentes se guardan en la tabla `public_space_affectations` (migracion
`20261109230000_public_space_affectations`). Cada una se restaura una sola vez.

| Campo | Tipo Avro | Origen |
| --- | --- | --- |
| `afectacionId` | `string` | el de la afectacion que termina |
| `espacioId` | `string` | id del espacio |
| `correlationId` | `string` | `afectacion-<afectacionId>` |
| `restauradoAt` | `string` (ISO-8601) | momento en que termino |

| Hecho | Que afectaciones termina |
| --- | --- |
| Se levantan las medidas de una alerta finalizada (`POST /api/admin/weather-alerts/:id/release`) | las `EVENTO_CLIMATICO` de esa alerta |
| Un administrador vuelve a habilitar el espacio (`ENABLED`) | el `CERRADO` sin causa de ese espacio (las que tienen causa siguen su ciclo) |
| `ReclamoActualizado` pasa a `RESUELTO`, `RECHAZADO` o `CERRADO` | las `RECLAMO` e `INCIDENTE_VIAL` de ese reclamo |
| `ReclamoReclasificado` deja de cortar la circulacion | las `RECLAMO` e `INCIDENTE_VIAL` de ese reclamo |
| Se finaliza la intervencion del reclamo (`POST /api/admin/interventions/:reclamoId/finish`) | las `RECLAMO` e `INCIDENTE_VIAL` de ese reclamo |

Las afectaciones publicadas antes de esta version no estan en la tabla, asi que nunca reciben su
`EspacioPublicoRestaurado`.

## Puesta en marcha

Registrar los contratos y aplicar la migracion **antes** de desplegar el backend. Sin los contratos, el
gateway rechaza las fechas ISO de `EspacioPublicoAfectado` y no conoce `EspacioPublicoRestaurado`. Sin la
migracion falta la tabla `public_space_affectations`:

```bash
npx prisma migrate deploy
```

Despues:

```bash
npm run eda:register-events -- --update-compatible
```

- `ActividadModificada` y `EspacioPublicoRestaurado` son nuevos y se registran sin ese flag.
- `EspacioPublicoAfectado` cambia de tipo: con `--update-compatible` EDA crea el topico `.v2`.
- `ActividadCreada` ya esta registrado: sin `--update-compatible`, el script corta con "El esquema
  registrado difiere del local" y deja de procesar los contratos que siguen.
- Quienes consuman `ActividadModificada` necesitan su propia suscripcion en el gateway.

## Tablero de Analítica embebido en el admin

Analítica (Grupo 8) arma un tablero HTML por módulo con los indicadores que calcula a partir de nuestros eventos
y su informe semanal. El admin lo ve en **Admin → Analítica** (`/admin/analytics`).

1. El front llama a `GET /api/admin/analytics` con el token del admin, igual que el resto del admin. No usamos
   cookies, así que un `<iframe src>` apuntando al backend no podría autenticarse.
2. El backend verifica el permiso `analytics.view` y llama a `GET {ANALITICA_URL}/embed/espacios` con nuestro
   token de servicio (client credentials, el mismo cliente que usamos para el EDA) y el token del admin. Mientras
   Analítica no cierre el nombre del header, el token del admin va en `X-User-Token` y en `X-Usuario-Token`.
3. Acepta la respuesta como JSON `{ modulo, generado_en, html }` o como HTML directo, y devuelve
   `{ html, generatedAt }` con `Cache-Control: no-store`.
4. El front muestra el HTML en un iframe con `srcdoc` y `sandbox="allow-scripts"`, sin `allow-same-origin`: el
   tablero no puede leer la sesión ni el DOM del admin. Ajusta la altura con el mensaje `citypass-tablero-altura`.

Sin `ANALITICA_URL` en el entorno del backend, la pantalla avisa que Analítica todavía no está configurada (503).

**Por qué el backend llama a otro módulo acá.** La integración entre módulos es por eventos y el backend no llama
a la API de otros módulos. Este tablero es la excepción: no entra ningún dato de negocio a nuestro sistema, solo
se trae una vista para mostrar. Analítica pidió hacerlo servidor a servidor para validar nuestro token de servicio
y no exponer su URL ni necesitar CORS.
