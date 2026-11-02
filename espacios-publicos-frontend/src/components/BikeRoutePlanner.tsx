import { Alert, Box, Button, Card, Flex, List, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconBike, IconWalk } from '@tabler/icons-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { getEventRoutePlan } from '../lib/api';
import type { EventRoutePlan, RoutePath } from '../lib/api';
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

function formatAge(calculatedAt: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(calculatedAt).getTime()) / 60_000));

  return `Calculada hace ${minutes} min`;
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

function RouteSummary({ icon, label, route }: { icon: React.ReactNode; label: string; route: RoutePath | null }) {
  return (
    <Card withBorder radius="md" p="md">
      <Flex align="center" gap="md">
        <ThemeIcon variant="light" size="lg" radius="md">{icon}</ThemeIcon>
        <Box>
          <Text fz="xs" c="dimmed" fw={600} tt="uppercase">{label}</Text>
          {route ? (
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
  // La antigüedad se calcula contra el momento en que llegó el plan, no en cada render.
  const [receivedAt, setReceivedAt] = useState(0);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Si el usuario niega la ubicacion o falla, se pide el plan solo con la llegada.
      const origin = await requestPosition();
      const result = await getEventRoutePlan(eventId, origin ? { latitude: origin[0], longitude: origin[1] } : undefined);
      setReceivedAt(Date.now());
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

  const points = useMemo<LatLng[]>(() => {
    if (!plan) {
      return [];
    }

    const all: LatLng[] = [[plan.destination.latitude, plan.destination.longitude]];
    if (plan.origin) all.push([plan.origin.latitude, plan.origin.longitude]);
    if (plan.dropoff) all.push([plan.dropoff.latitude, plan.dropoff.longitude]);
    plan.incidents.forEach((incident) => all.push([incident.latitude, incident.longitude]));
    plan.bikeRoute?.coordinates.forEach((point) => all.push(point));
    plan.walkRoute?.coordinates.forEach((point) => all.push(point));

    return all;
  }, [plan]);


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
          {plan.dropoff && (
            <Alert color="blue" variant="light" mb="sm">
              {plan.dropoff.message}
              <Text size="xs" c="dimmed" mt={4}>{formatAge(plan.dropoff.calculatedAt, receivedAt)}</Text>
            </Alert>
          )}

          {plan.dropoff && plan.dropoff.discardedByIncidents > 0 && (
            <Alert color="orange" variant="light" mb="sm" icon={<IconAlertTriangle size="1.2rem" />}>
              Movilidad descartó {plan.dropoff.discardedByIncidents}{' '}
              {plan.dropoff.discardedByIncidents === 1 ? 'estación cercana' : 'estaciones cercanas'} por incidentes
            </Alert>
          )}

          {plan.incidents.length > 0 && (
            <Alert
              color="orange"
              variant="light"
              mb="sm"
              icon={<IconAlertTriangle size="1.2rem" />}
              title={`Hay ${plan.incidents.length} ${plan.incidents.length === 1 ? 'incidente cerca' : 'incidentes cerca'} del evento: la estación sugerida ya los tiene en cuenta`}
            >
              <List size="sm" spacing={2}>
                {plan.incidents.map((incident, index) => (
                  <List.Item key={`${incident.source}-${index}`}>
                    {incident.category || 'Incidente'} a {Math.round(incident.distanceMeters)} m
                  </List.Item>
                ))}
              </List>
            </Alert>
          )}

          {plan.warnings.map((warning) => (
            <Alert key={warning} color="yellow" variant="light" mb="sm">
              {warning}
            </Alert>
          ))}

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

              {plan.incidents.map((incident, index) => (
                <Marker key={`${incident.source}-${index}`} position={[incident.latitude, incident.longitude]} icon={incidentIcon}>
                  <Popup>
                    <strong>{incident.category || 'Incidente'}</strong>
                    <br />
                    A {Math.round(incident.distanceMeters)} m del evento
                  </Popup>
                </Marker>
              ))}

              {origin && dropoff && (
                plan.bikeRoute ? (
                  <Polyline positions={plan.bikeRoute.coordinates} pathOptions={{ color: '#1c7ed6', weight: 5 }} />
                ) : (
                  <Polyline positions={[origin, dropoff]} pathOptions={{ color: '#1c7ed6', weight: 3, dashArray: '4 8' }} />
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

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
            <RouteSummary icon={<IconBike size="1.2rem" />} label="En bici" route={plan.bikeRoute} />
            <RouteSummary icon={<IconWalk size="1.2rem" />} label="A pie" route={plan.walkRoute} />
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
}
