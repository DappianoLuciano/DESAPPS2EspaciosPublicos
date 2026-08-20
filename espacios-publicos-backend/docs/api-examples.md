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
    "capacity": 500,
    "imageUrl": "https://example.com/parque.jpg"
  }'
```

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
    "capacity": 300,
    "requiresRegistration": true,
    "startDate": "2026-09-15T13:00:00.000Z",
    "endDate": "2026-09-15T20:00:00.000Z",
    "imageUrl": "https://example.com/feria.jpg"
  }'
```
