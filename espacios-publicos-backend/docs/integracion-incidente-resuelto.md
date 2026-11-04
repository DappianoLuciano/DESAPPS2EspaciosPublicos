# Evento de resolución de una intervención

El módulo deja definido el evento que posteriormente se publicará hacia Reclamos.
Esta versión prepara y valida el contrato, pero todavía no lo conecta al gateway.

## Nombre

`com.citypass.espacios.IncidenteResuelto`

## Payload

```json
{
  "reclamoId": "uuid",
  "correlationId": "req-uuid",
  "resultado": "RESUELTO",
  "idAuto": "AB123CD",
  "solicitadoAt": 1793793900000,
  "resueltoAt": 1793794800000
}
```

Las fechas usan epoch en milisegundos. Cuando Movilidad indica que no hace
falta una grúa, `idAuto` y `solicitadoAt` son `null`; el caso se resuelve de
forma automática y `resueltoAt` conserva la hora de esa resolución.

El evento solamente puede prepararse cuando la intervención está en estado
`COMPLETED`. Si requirió grúa, también exige una patente y una fecha de
solicitud. `correlationId` se conserva desde el evento recibido de Movilidad
para permitir el seguimiento del flujo entre módulos.

## Integración pendiente

Cuando se habilite la integración real, la salida de
`createIncidenteResueltoEvent` deberá persistirse en el outbox y publicarse por
el `EventBus`. Esa conexión queda deliberadamente fuera de este cambio.
