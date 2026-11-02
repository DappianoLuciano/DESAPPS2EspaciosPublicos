import { Box, Group, Text } from '@mantine/core';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  value: Coordinates | null;
  height?: number;
}

// Centro por defecto cuando el espacio todavia no tiene ubicacion: el Obelisco.
const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];

// Con Vite, el icono por defecto de Leaflet pierde la ruta de sus imagenes.
// Se arma explicito para que el marcador se vea en desarrollo y en el build.
export const markerIconConfig = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Cuando la ubicacion cambia desde el buscador, el mapa la sigue.
function FollowValue({ value }: { value: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) {
      map.setView([value.latitude, value.longitude], Math.max(map.getZoom(), 16));
    }
  }, [map, value]);
  return null;
}

/**
 * Vista previa de la ubicacion resuelta desde una direccion.
 * No permite modificar las coordenadas con clics ni arrastrando el marcador.
 */
export default function LocationPicker({ value, height = 240 }: LocationPickerProps) {
  return (
    <Box>
      <Box
        h={height}
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--mantine-color-gray-3)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <MapContainer
          center={value ? [value.latitude, value.longitude] : DEFAULT_CENTER}
          zoom={value ? 16 : 12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FollowValue value={value} />
          {value && (
            <Marker
              position={[value.latitude, value.longitude]}
              draggable={false}
              icon={markerIconConfig}
            />
          )}
        </MapContainer>
      </Box>
      <Group justify="space-between" mt={6}>
        <Text size="xs" c="dimmed">
          {value
            ? 'Ubicación obtenida de la dirección seleccionada. Para cambiarla, buscá otra dirección.'
            : 'Ingresá una dirección y presioná «Ubicar dirección» para mostrar el espacio.'}
        </Text>
        {value && (
          <Text size="xs" c="dimmed" ff="monospace">
            {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
          </Text>
        )}
      </Group>
    </Box>
  );
}
