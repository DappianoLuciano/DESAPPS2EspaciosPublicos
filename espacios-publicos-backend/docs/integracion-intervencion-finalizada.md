# Evento de finalización de una intervención

Espacios Públicos publica este evento para que Reclamos cierre el reclamo y
Residuos libere el contenedor asociado.

## Nombre

`com.citypass.espacios.IntervencionFinalizada`

## Payload

```json
{
  "reclamoId": "uuid",
  "resultado": "RESUELTO",
  "idAuto": "AB123CD",
  "solicitadoAt": 1793793900000,
  "resueltoAt": 1793794800000
}
```

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `reclamoId` | string | Reclamo que debe cerrar el módulo de Reclamos. |
| `resultado` | string | Actualmente siempre se publica como `RESUELTO`. |
| `idAuto` | string \| null | Patente normalizada del vehículo retirado. |
| `solicitadoAt` | long \| null | Solicitud de la grúa en epoch milisegundos. |
| `resueltoAt` | long | Finalización de la intervención en epoch milisegundos. |

Las fechas usan epoch en milisegundos. Cuando Movilidad indica que no hace
falta una grúa, `idAuto` y `solicitadoAt` son `null`; el caso se resuelve y
publica automáticamente.

Ejemplo de resolución automática sin grúa:

```json
{
  "reclamoId": "uuid",
  "resultado": "RESUELTO",
  "idAuto": null,
  "solicitadoAt": null,
  "resueltoAt": 1793794800000
}
```

El evento se guarda primero en el outbox y luego se publica por el `EventBus`.
Si requirió grúa, solamente se crea después de que el administrador solicitó
el servicio y confirmó el retiro del vehículo.
