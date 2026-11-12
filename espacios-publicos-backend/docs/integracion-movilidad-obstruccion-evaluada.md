# Entrada desde Movilidad: obstrucción evaluada

Espacios Públicos consume la evaluación realizada por Movilidad para decidir
si una intervención debe esperar la gestión manual de una grúa o puede
resolverse automáticamente.

## Nombre del evento

`com.citypass.movilidad.MovilidadObstruccionEvaluada`

## Sobre recibido desde el Gateway

```json
{
  "metadata": {
    "eventId": "evento-uuid",
    "eventType": "com.citypass.movilidad.MovilidadObstruccionEvaluada"
  },
  "data": {
    "reclamoId": "reclamo-uuid",
    "correlationId": "correlation-uuid",
    "latitud": -34.6037,
    "longitud": -58.3816,
    "direccion": "Av. Corrientes 1000",
    "barrio": "San Nicolas",
    "afectaCiclovia": true,
    "estacionesAfectadasIds": [10, 11],
    "impactoCirculacion": "ALTO",
    "desvioSugerido": "Av. Cordoba",
    "requiereIntervencionInmediata": true,
    "requiereGrua": true,
    "evaluadoAt": 1794499200000
  }
}
```

## Campos de `data`

| Campo | Tipo | Obligatorio | Uso |
| --- | --- | --- | --- |
| `reclamoId` | string | Sí | Identifica el reclamo original. |
| `correlationId` | string | Sí | Permite seguir el recorrido entre módulos. |
| `latitud` | number | Sí | Latitud de la obstrucción, entre -90 y 90. |
| `longitud` | number | Sí | Longitud de la obstrucción, entre -180 y 180. |
| `direccion` | string | Sí | Dirección informada por Movilidad. |
| `barrio` | string | Sí | Barrio de la intervención. |
| `afectaCiclovia` | boolean | Sí | Indica si la ciclovía está afectada. |
| `estacionesAfectadasIds` | number[] | Sí | Identificadores no negativos de estaciones afectadas. |
| `impactoCirculacion` | string | Sí | Evaluación del impacto vial. |
| `desvioSugerido` | string | Sí | Desvío propuesto por Movilidad. |
| `requiereIntervencionInmediata` | boolean | Sí | Marca la urgencia informada. |
| `requiereGrua` | boolean | Sí | Define el recorrido manual o automático. |
| `evaluadoAt` | long | Sí | Fecha de evaluación en epoch milisegundos. |

Los textos se recortan antes de procesarse. Un payload incompleto, con tipos
incorrectos, coordenadas fuera de rango o una fecha inválida recibe `400` y no
se registra como procesado.

## Reglas de procesamiento

- `requiereGrua: true`: se crea una intervención `PENDING`. Solamente un
  administrador puede solicitar la grúa y confirmar el retiro del vehículo.
- `requiereGrua: false`: la intervención se marca `COMPLETED` y se publica
  `com.citypass.espacios.IntervencionFinalizada` automáticamente.
- `metadata.eventId` se registra después de completar el procesamiento. Una
  reentrega con el mismo identificador no vuelve a ejecutar la operación.
- `reclamoId` también evita crear más de una intervención para el mismo
  reclamo.

El endpoint receptor es `POST /webhooks/citypass?token=<GATEWAY_WEBHOOK_TOKEN>`.
Una entrega procesada, duplicada o ignorada responde `204`.
