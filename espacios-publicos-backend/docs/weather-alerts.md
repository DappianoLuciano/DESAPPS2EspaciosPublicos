# Alertas climaticas y EDA

El modulo consulta Open-Meteo, evalua umbrales configurables y crea una alerta `PENDING`.
No se publica ningun evento hasta que un administrador confirme la criticidad.

## Puesta en marcha

1. Coordinar y ejecutar `npm run prisma:deploy` para crear las tablas y enums nuevos.
2. Mantener `EVENT_BUS_DRIVER=console` mientras LDAP/EDA no entregue las credenciales de servicio.
3. Ingresar como administrador y abrir `/admin/weather-alerts` para consultar, confirmar o descartar.
4. Clasificar cada espacio como `INDOOR`, `OUTDOOR` o `MIXED` desde el panel de espacios.
5. Cuando EDA este disponible, registrar los contratos y cambiar el driver a `citypass`.

No se ejecuta automaticamente una migracion contra la base compartida al levantar el codigo.

## Flujo

1. `POST /api/internal/weather-cycle` ejecuta el ciclo horario con `CRON_SECRET`.
2. `POST /api/admin/weather-alerts/check` permite ejecutar el mismo ciclo en una demo.
3. Open-Meteo devuelve precipitacion, rafagas y codigos WMO para las proximas horas.
4. Si hay riesgo se crea una alerta pendiente; consultas equivalentes no crean duplicados.
5. El administrador confirma, ajusta el nivel o descarta el falso positivo.
6. Confirmar actualiza la alerta e inserta el evento en Outbox dentro de una unica transaccion.
7. El publicador envia los eventos climaticos pendientes a `ConsoleEventBus` o al Event Gateway y registra reintentos.
8. Al vencer o finalizar manualmente se publica `CriticidadClimaticaFinalizada`.

Una alerta confirmada `ALTA` o `CRITICA` bloquea nuevas reservas que se superpongan con su
vigencia en espacios `OUTDOOR` o `MIXED`. No cambia el estado administrativo del espacio.

## Eventos de integracion

El namespace definitivo sale del JWT de servicio. Los nombres configurados inicialmente son:

- `com.citypass.espacios.CriticidadClimaticaConfirmada`
- `com.citypass.espacios.CriticidadClimaticaFinalizada`

El payload confirmado contiene solamente datos de negocio:

```json
{
  "alertaId": "uuid",
  "nivelCriticidad": "ALTA",
  "fenomeno": "TORMENTA_FUERTE",
  "ubicaciones": [
    { "latitud": -34.6037, "longitud": -58.3816 },
    { "latitud": -34.5631, "longitud": -58.4584 }
  ],
  "vigenciaDesde": 1792594800000,
  "vigenciaHasta": 1792616400000,
  "actorSub": "admin-1"
}
```

`eventId`, `source`, `receivedAt`, `schemaId` y `payloadHash` no se envian: los agrega el gateway.

### Acuerdo para los consumidores

- Confirmación incluye `ubicaciones: [{latitud, longitud}]` y `vigenciaDesde`.
  No representan un polígono, radio de afectación ni un listado de barrios afectados.
  La zona interna se conserva para las reglas actuales de reservas, pero no se envía al gateway.
- Configurar `WEATHER_LOCATIONS` como un array JSON de objetos `latitude/longitude`
  para consultar múltiples puntos en una petición. Sin esa variable se mantiene el punto configurado.
  Se agrupan solo puntos con igual fenómeno, nivel sugerido y período exacto.
  Cambiar la cobertura genera otra alerta; no modifica una alerta confirmada.
  La evidencia numérica visible corresponde al primer punto del grupo.
- El cierre transmite `{alertaId, finalizadaEn, actorSub}`. Se trata de otro evento
  y conserva el alertaId original. El historial confirmado no se sobrescribe.
  El vencimiento sigue provocando cierre al ejecutar el ciclo; no se eliminó esa lógica.
- El catálogo agrega `OLA_DE_CALOR`, `OLA_DE_FRIO`, `GRANIZO`,
  `TORMENTA_ELECTRICA`, `HURACAN` y `NIEVE`, conservando los valores históricos.
  Los códigos 95 sugieren tormenta eléctrica; 96/99, granizo; 71/73/75/77/85/86, nieve.
  Los códigos 80–82 corresponden a chubascos y ahora se agrupan como lluvia.
  Los niveles asignados son criterios técnicos de demostración, no alertas oficiales.
- Olas de calor/frío y huracanes están disponibles en el catálogo y la demo,
  pero no se detectan automáticamente. Requieren criterios y fuentes adicionales;
  no se infiere un huracán de una ráfaga ni una ola de calor de una sola temperatura.
  La creación manual queda pendiente de definición.
- Se agregó una migración independiente para ampliar el enum PostgreSQL;
  no se modificó la migración original ni se aplicaron cambios a bases remotas.
- Si los contratos ya estaban registrados en EDA, hay que acordar su evolución:
  el script de registro no actualiza un contrato existente ante un HTTP 409.

- El mensaje informa un hecho; no ordena acciones. Cada squad decide su politica por nivel.
- `alertaId` es la clave de negocio para aplicar confirmacion/finalizacion de forma idempotente.
- `vigenciaHasta` y `finalizadaEn` son epoch milliseconds, segun `timestamp-millis` de Avro.
- `BAJA` y `MEDIA` solo dejan la contingencia visible en este modulo. `ALTA` y `CRITICA`
  bloquean nuevas reservas superpuestas en espacios `OUTDOOR` o `MIXED`.
- Los reintentos del gateway son `at-least-once`; los consumidores deben tolerar duplicados.
- Las confirmaciones `<modulo>.contingencia.aplicada` requieren acordar primero un contrato y
  una suscripcion Kafka/webhook. No se inventa ese payload dentro de este cambio.

## Registrar los contratos

### Carga manual

Mediciones opcionales: `rafagaMaxKmh` (no negativa), `precipitacionAcumuladaMm`
(no negativa), `temperaturaMinC` y `temperaturaMaxC` (°C, mínima <= máxima).
Son estimaciones respaldadas por la fuente para la vigencia indicada. Ausente no significa cero.
La carga manual no recalcula criticidad a partir de esas mediciones.
Open-Meteo consulta `temperature_2m` en Celsius; se conservan extremos del período
y, al agrupar ubicaciones, la mínima y máxima del grupo. No se detectan olas térmicas
automáticamente con este cambio.
Confirmación EDA agrega `temperaturaMinC` y `temperaturaMaxC`, nullable double con
default null en el contrato propuesto. Null indica que no se dispone del dato.
Las alertas históricas conservan null; las nuevas mediciones viven en evidence JSON.
Ráfaga y precipitación siguen siendo evidencia interna. El cierre no cambia.
Se debe acordar la evolución del contrato con EDA antes de publicar bajo un esquema anterior.

- GET `/api/admin/weather-alerts/locations` expone el catálogo local de 48 barrios.
  Se derivaron centroides interiores del polígono principal del dataset oficial
  GCBA: https://cdn.buenosaires.gob.ar/datosabiertos/datasets/barrios/barrios.geojson
  (CC-BY-2.5-AR). Son puntos representativos WGS84, no límites de afectación.
- POST `/api/admin/weather-alerts/manual` requiere permiso administrativo
  `weather-alert.create-manual` y campos `fenomeno`, `nivelCriticidad`,
  `ubicacionesIds`, `vigenciaDesde`, `vigenciaHasta`, `motivo`, `fuente`.
  El servidor resuelve coordenadas y autor; no acepta coordenadas o identidad arbitrarias.
- La alerta nace PENDING. No llama a Open-Meteo ni publica a EDA.
  La evidencia JSON guarda proveedor MANUAL, fecha, autor, fuente, motivo e IDs del catálogo.
  No se requiere otra migración para este flujo; se usa la tabla weather_alerts existente.
- Confirmación, descarte y finalización reutilizan los casos de uso existentes.
  El contrato EDA sigue enviando solo coordenadas, nunca barrios, motivo ni fuente manual.
  Para ejercicios, acordar un entorno de prueba; confirmar sigue siendo una publicación real
  si EVENT_BUS_DRIVER=citypass. La carga manual no permite afirmar un fenómeno real sin respaldo.

Con el gateway y el emisor OAuth disponibles, configurar las variables `EVENT_*` y ejecutar una vez:

```bash
npm run eda:register-events
```

El script registra los dos contratos climaticos y los cuatro de espacios y cultura
(`EventoComunitarioPublicado`, `EventoCancelado`, `EspacioEstadoCambiado` y `ReservaConfirmada`;
ver `docs/eventos-cu-int-01.md`). Luego cambiar `EVENT_BUS_DRIVER=citypass`. En modo `console`,
ningun flujo depende de LDAP ni de Kafka.

## Scheduler

El workflow `.github/workflows/weather-cycle.yml` llama al endpoint cada hora. Configurar:

- `WEATHER_CYCLE_URL`: URL completa terminada en `/api/internal/weather-cycle`.
- `WEATHER_CRON_SECRET`: mismo valor que `CRON_SECRET` en el backend.

El workflow tambien se puede ejecutar manualmente desde GitHub Actions.
