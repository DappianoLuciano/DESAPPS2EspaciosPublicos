# Ejemplos de API

## Healthcheck

```bash
curl http://localhost:3000/health
```

## Crear espacio publico

```bash
curl -X POST http://localhost:3000/api/public-spaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Parque Centenario",
    "description": "Espacio verde para actividades culturales y comunitarias.",
    "address": "Av. Diaz Velez, CABA",
    "zone": "Caballito",
    "capacity": 500,
    "imageUrl": "https://example.com/parque.jpg"
  }'
```

## Consultar eventos comunitarios disponibles

Sin filtros:

```bash
curl http://localhost:3000/api/community-events
```

Con filtros opcionales:

```bash
curl "http://localhost:3000/api/community-events?category=Cultura&zone=Caballito&date=2026-09-15&availableOnly=true"
```

La respuesta incluye `availableCapacity` para que el ciudadano pueda decidir si inscribirse.

## Solicitar reserva

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "publicSpaceId": "ID_DEL_ESPACIO",
    "requesterName": "Centro Cultural Barrial",
    "requesterEmail": "contacto@centro.test",
    "estimatedAttendees": 80,
    "startDate": "2026-09-10T15:00:00.000Z",
    "endDate": "2026-09-10T18:00:00.000Z"
  }'
```

## Crear evento comunitario

```bash
curl -X POST http://localhost:3000/api/community-events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Feria de emprendedores",
    "category": "Cultura",
    "description": "Encuentro comunitario con puestos culturales y talleres.",
    "publicSpaceId": "ID_DEL_ESPACIO",
    "organizerName": "Comuna 6",
    "organizerProfileEnabled": true,
    "capacity": 300,
    "requiresRegistration": true,
    "startDate": "2026-09-15T13:00:00.000Z",
    "endDate": "2026-09-15T20:00:00.000Z",
    "imageUrl": "https://example.com/feria.jpg"
  }'
```

## Inscribirse a evento comunitario

En una version con autenticacion real, el ciudadano saldria del usuario logueado. En este Sprint se envia en el body para poder probar el flujo sin login.

```bash
curl -X POST http://localhost:3000/api/community-events/ID_DEL_EVENTO/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "citizenName": "Ana Gomez",
    "citizenEmail": "ana.gomez@test.com"
  }'
```

## Consultar inscriptos de un evento

```bash
curl http://localhost:3000/api/community-events/ID_DEL_EVENTO/registrations
```
