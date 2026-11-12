# Evento de actividad creada

Al crear un evento comunitario se mantienen dos salidas complementarias:

- `com.citypass.espacios.EventoComunitarioPublicado`, consumido por Reclamos.
- `com.citypass.espacios.ActividadCreada`, consumido por Residuos.

`ActividadCreada` usa el mismo identificador del evento comunitario en
`actividadId` y siempre incluye ubicación y horarios en milisegundos.

```json
{
  "actividadId": "uuid",
  "titulo": "Festival comunitario",
  "estado": "ACTIVE",
  "capacidad": 1000,
  "fechaHoraInicio": 1795867200000,
  "fechaHoraFinalizacion": 1795993200000,
  "ubicacion": {
    "lat": -34.6064,
    "lng": -58.4357
  },
  "direccion": "Leopoldo Marechal y Lillo",
  "espacioNombre": "Anfiteatro del Parque Centenario"
}
```

Los dos eventos se guardan en el outbox antes de enviarse al Gateway. Las
cancelaciones se comunican mediante `com.citypass.espacios.EventoCancelado`;
su `eventoId` coincide con `actividadId`.
