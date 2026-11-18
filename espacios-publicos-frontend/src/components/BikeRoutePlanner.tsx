import { Alert, Box, Button, Card, Flex, Grid, List, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconBike, IconWalk } from '@tabler/icons-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { findPickupStation, getEventRoutePlan } from '../lib/api';
import type { EventRoutePlan, RoutePath, RoutePlanRadiusIncident } from '../lib/api';
import { markerIconConfig } from './LocationPicker';

type LatLng = [number, number];

const GEOLOCATION_TIMEOUT_MS = 8000;

function pinIcon(color: string, symbol: string) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;line-height:1">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const originIcon = pinIcon('#2f9e44', '&#9679;');
const pickupIcon = pinIcon('#f08c00', 'R');
const dropoffIcon = pinIcon('#1c7ed6', 'D');
const incidentIcon = pinIcon('#e03131', '!');

// El mapa encuadra todos los puntos cada vez que cambia el plan.
function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 17 });
    }
  }, [map, points]);

  return null;
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function requestPosition(): Promise<LatLng | null> {
  if (!('geolocation' in navigator)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.latitude, position.coords.longitude]),
      () => resolve(null),
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 60_000 },
    );
  });
}

// Por debajo de esta distancia en linea recta la estacion queda practicamente en la puerta. OSRM
// ajusta ambos puntos a la misma calle y puede devolver un tramo de pocos metros que confunde.
const NEXT_TO_EVENT_METERS = 100;
// Lo agrega el backend cuando la estacion de retiro es la misma que la de devolucion.
const WALK_INSTEAD_WARNING = 'Estás cerca del evento: conviene ir caminando.';

function RouteSummary({ icon, label, route, note }: { icon: React.ReactNode; label: string; route: RoutePath | null; note?: string }) {
  return (
    <Card withBorder radius="md" p="md">
      <Flex align="center" gap="md">
        <ThemeIcon variant="light" size="lg" radius="md">{icon}</ThemeIcon>
        <Box>
          <Text fz="xs" c="dimmed" fw={600} tt="uppercase">{label}</Text>
          {note ? (
            <Text fw={700}>{note}</Text>
          ) : route ? (
            <Text fw={700}>{formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}</Text>
          ) : (
            <Text c="dimmed" fz="sm">Sin estimación</Text>
          )}
        </Box>
      </Flex>
    </Card>
  );
}

export default function BikeRoutePlanner({ eventId }: { eventId: string }) {
  const [plan, setPlan] = useState<EventRoutePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Aviso sobre la estacion de retiro: Movilidad no tiene una cerca o no respondio.
  const [pickupNotice, setPickupNotice] = useState<string | null>(null);
  // Explicacion de Movilidad sobre la estacion de retiro elegida (por ejemplo, la mas cercana no tiene bicis).
  const [pickupMessage, setPickupMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Si el usuario niega la ubicacion o falla, se pide el plan solo con la llegada.
      const position = await requestPosition();
      const origin = position ? { latitude: position[0], longitude: position[1] } : undefined;
      const lookup = origin ? await findPickupStation(origin) : null;
      let result: EventRoutePlan;

      if (lookup?.kind === 'station') {
        // A pie hasta la estacion de retiro, en bici hasta la de devolucion y a pie al evento.
        result = await getEventRoutePlan(eventId, origin, lookup.station);
        setPickupNotice(null);
        setPickupMessage(lookup.message);
      } else if (lookup?.kind === 'none') {
        // Sin bicis de la ciudad cerca no se dibuja un tramo en bici desde la ubicacion.
        result = await getEventRoutePlan(eventId);
        setPickupNotice(lookup.message);
        setPickupMessage(null);
      } else {
        result = await getEventRoutePlan(eventId, origin);
        setPickupMessage(null);
        setPickupNotice(origin ? 'No pudimos consultar la estación de retiro en Movilidad: el recorrido en bici sale desde tu ubicación.' : null);
      }
      setPlan(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo calcular cómo llegar.');
    } finally {
      setLoading(false);
    }
  };

  const destination: LatLng | null = plan ? [plan.destination.latitude, plan.destination.longitude] : null;
  const origin: LatLng | null = plan?.origin ? [plan.origin.latitude, plan.origin.longitude] : null;
  const dropoff: LatLng | null = plan?.dropoff ? [plan.dropoff.latitude, plan.dropoff.longitude] : null;
  const pickup: LatLng | null = plan?.pickup ? [plan.pickup.latitude, plan.pickup.longitude] : null;
  // Desde donde sale el tramo en bici: la estacion de retiro o, sin ella, la ubicacion del ciudadano.
  const rideStart = pickup ?? origin;

  // Los de zona no tienen coordenadas: van solo como aviso de texto, nunca al mapa.
  const nearbyIncidents = useMemo(
    () => (plan?.incidents ?? []).filter((incident): incident is RoutePlanRadiusIncident => incident.matchedBy !== 'ZONE' && incident.latitude !== null && incident.longitude !== null),
    [plan]
  );
  const zoneIncidents = useMemo(
    () => (plan?.incidents ?? []).filter((incident) => incident.matchedBy === 'ZONE'),
    [plan]
  );

  const points = useMemo<LatLng[]>(() => {
    if (!plan) {
      return [];
    }

    const all: LatLng[] = [[plan.destination.latitude, plan.destination.longitude]];
    if (plan.origin) all.push([plan.origin.latitude, plan.origin.longitude]);
    if (plan.dropoff) all.push([plan.dropoff.latitude, plan.dropoff.longitude]);
    if (plan.pickup) all.push([plan.pickup.latitude, plan.pickup.longitude]);
    plan.walkToPickupRoute?.coordinates.forEach((point) => all.push(point));
    nearbyIncidents.forEach((incident) => all.push([incident.latitude, incident.longitude]));
    plan.bikeRoute?.coordinates.forEach((point) => all.push(point));
    plan.walkRoute?.coordinates.forEach((point) => all.push(point));

    return all;
  }, [plan, nearbyIncidents]);


  return (
    <Box>
      <Title order={3} mt={40} mb="md">Cómo llegar en bici</Title>

      <Button
        leftSection={<IconBike size="1.2rem" />}
        onClick={handleClick}
        loading={loading}
        variant={plan ? 'light' : 'filled'}
      >
        {plan ? 'Actualizar recorrido' : 'Cómo llegar en bici'}
      </Button>
      <Text size="xs" c="dimmed" mt={6}>Tu ubicación solo se usa para calcular el recorrido</Text>

      {error && (
        <Alert color="red" mt="md">
          {error}
        </Alert>
      )}

      {plan && destination && (
        <Box mt="lg">
          {pickupMessage && plan.pickup && (
            <Alert color="blue" variant="light" mb="sm" title="Retiro">
              {pickupMessage}
            </Alert>
          )}

          {plan.dropoff && (
            <Alert color="blue" variant="light" mb="sm" title="Devolución">
              {plan.dropoff.message}
            </Alert>
          )}

          {plan.dropoff && plan.dropoff.discardedByIncidents > 0 && (
            <Alert color="orange" variant="light" mb="sm" icon={<IconAlertTriangle size="1.2rem" />}>
              Movilidad descartó {plan.dropoff.discardedByIncidents}{' '}
              {plan.dropoff.discardedByIncidents === 1 ? 'estación cercana' : 'estaciones cercanas'} por incidentes
            </Alert>
          )}

          {zoneIncidents.length > 0 && (
            <Alert color="red" variant="light" mb="sm" icon={<IconAlertTriangle size="1.2rem" />}>
              <List size="sm" spacing={2}>
                {zoneIncidents.map((incident, index) => (
                  <List.Item key={`zone-${incident.source}-${index}`}>
                    {incident.source === 'EMERGENCIAS' ? 'Emergencia activa' : 'Incidente activo'} en el barrio {incident.zone}
                    {incident.category ? ` (${incident.category})` : ''}
                  </List.Item>
                ))}
              </List>
            </Alert>
          )}

          {nearbyIncidents.length > 0 && (
            <Alert
              color="orange"
              variant="light"
              mb="sm"
              icon={<IconAlertTriangle size="1.2rem" />}
              title={`Hay ${nearbyIncidents.length} ${nearbyIncidents.length === 1 ? 'incidente cerca' : 'incidentes cerca'} del evento: la estación sugerida ya los tiene en cuenta`}
            >
              <List size="sm" spacing={2}>
                {nearbyIncidents.map((incident, index) => (
                  <List.Item key={`${incident.source}-${index}`}>
                    {incident.category || 'Incidente'} a {Math.round(incident.distanceMeters)} m
                  </List.Item>
                ))}
              </List>
            </Alert>
          )}

          {pickupNotice && (
            <Alert color="yellow" variant="light" mb="sm">
              {pickupNotice}
            </Alert>
          )}

          {plan.warnings.map((warning) => (
            <Alert key={warning} color="yellow" variant="light" mb="sm">
              {warning}
            </Alert>
          ))}

          {/* Los tramos van al costado del mapa: abajo quedaban tapados por el boton del chatbot. */}
          <Grid gap="md">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card withBorder radius="md" p={0} h={380} style={{ overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                <MapContainer center={destination} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitBounds points={points} />

                  <Marker position={destination} icon={markerIconConfig}>
                    <Popup>
                      <strong>{plan.destination.title}</strong>
                      <br />
                      {plan.destination.address}
                    </Popup>
                  </Marker>

                  {origin && (
                    <Marker position={origin} icon={originIcon}>
                      <Popup>
                        <strong>Tu ubicación</strong>
                      </Popup>
                    </Marker>
                  )}

                  {pickup && plan.pickup && (
                    <Marker position={pickup} icon={pickupIcon}>
                      <Popup>
                        <strong>Retiro: {plan.pickup.stationName}</strong>
                        <br />
                        {plan.pickup.availableBikes !== null ? `${plan.pickup.availableBikes} bicis disponibles` : 'Estación de retiro'}
                      </Popup>
                    </Marker>
                  )}

                  {dropoff && plan.dropoff && (
                    <Marker position={dropoff} icon={dropoffIcon}>
                      <Popup>
                        <strong>Devolución: {plan.dropoff.stationName}</strong>
                        <br />
                        {plan.dropoff.availableSlots !== null ? `${plan.dropoff.availableSlots} lugares libres` : 'Estación de devolución'}
                        {plan.dropoff.distanceMeters !== null && ` · a ${plan.dropoff.distanceMeters} m del evento`}
                      </Popup>
                    </Marker>
                  )}

                  {nearbyIncidents.map((incident, index) => (
                    <Marker key={`${incident.source}-${index}`} position={[incident.latitude, incident.longitude]} icon={incidentIcon}>
                      <Popup>
                        <strong>{incident.category || 'Incidente'}</strong>
                        <br />
                        A {Math.round(incident.distanceMeters)} m del evento
                      </Popup>
                    </Marker>
                  ))}

                  {origin && pickup && (
                    plan.walkToPickupRoute ? (
                      <Polyline positions={plan.walkToPickupRoute.coordinates} pathOptions={{ color: '#495057', weight: 4, dashArray: '2 8' }} />
                    ) : (
                      <Polyline positions={[origin, pickup]} pathOptions={{ color: '#495057', weight: 3, dashArray: '4 8' }} />
                    )
                  )}

                  {plan.bikeRoute ? (
                    <Polyline positions={plan.bikeRoute.coordinates} pathOptions={{ color: '#1c7ed6', weight: 5 }} />
                  ) : (
                    // Sin recorrido en bici (fallo el ruteo) se marca en linea recta, salvo que convenga caminar.
                    rideStart && dropoff && !plan.warnings.includes(WALK_INSTEAD_WARNING) && (
                      <Polyline positions={[rideStart, dropoff]} pathOptions={{ color: '#1c7ed6', weight: 3, dashArray: '4 8' }} />
                    )
                  )}

                  {dropoff && (
                    plan.walkRoute ? (
                      <Polyline positions={plan.walkRoute.coordinates} pathOptions={{ color: '#495057', weight: 4, dashArray: '2 8' }} />
                    ) : (
                      <Polyline positions={[dropoff, destination]} pathOptions={{ color: '#495057', weight: 3, dashArray: '4 8' }} />
                    )
                  )}
                </MapContainer>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="sm">
                {plan.pickup && (
                  <RouteSummary
                    icon={<IconWalk size="1.2rem" />}
                    label={`A pie hasta ${plan.pickup.stationName}`}
                    route={plan.walkToPickupRoute}
                  />
                )}
                <RouteSummary
                  icon={<IconBike size="1.2rem" />}
                  label={plan.dropoff ? `En bici hasta ${plan.dropoff.stationName}` : 'En bici'}
                  route={plan.bikeRoute}
                />
                <RouteSummary
                  icon={<IconWalk size="1.2rem" />}
                  label="A pie hasta el evento"
                  route={plan.walkRoute}
                  note={
                    plan.dropoff?.distanceMeters != null && plan.dropoff.distanceMeters <= NEXT_TO_EVENT_METERS
                      ? `Estación ${plan.dropoff.stationName} a ${plan.dropoff.distanceMeters} m del evento`
                      : undefined
                  }
                />
              </Stack>
            </Grid.Col>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
