import { Alert, Box, Button, Card, Group, Loader, Text, Title } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAnalyticsDashboard } from '../lib/api';
import type { AnalyticsDashboard } from '../lib/api';

const MIN_HEIGHT = 900;

// Tablero de Analítica (Grupo 8): viene como una página HTML completa con los datos adentro. Se muestra en un
// iframe con srcdoc y sandbox="allow-scripts" sin allow-same-origin: el tablero no puede tocar la sesión, las
// cookies ni el DOM del admin.
export default function Analytics() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);
  const frame = useRef<HTMLIFrameElement>(null);

  const load = useCallback(() => {
    getAnalyticsDashboard()
      .then((dashboard) => {
        setData(dashboard);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Analítica no está disponible.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // El tablero avisa su altura para que no haya doble scroll. Solo se acepta de nuestro iframe: con srcdoc y sin
  // allow-same-origin su origen es "null".
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'null' || event.source !== frame.current?.contentWindow) {
        return;
      }
      const message = event.data as { tipo?: string; altura?: unknown } | null;
      if (message?.tipo === 'citypass-tablero-altura' && typeof message.altura === 'number') {
        setHeight(Math.max(MIN_HEIGHT, Math.min(Math.round(message.altura), 20_000)));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <Box p={{ base: 'md', sm: 40 }}>
      <Group justify="space-between" align="flex-start" mb="lg">
        <Box>
          <Title order={1} fz={32}>Analítica</Title>
          <Text c="dimmed" mt="xs">
            Indicadores de Espacios Públicos y Cultura e informe semanal, calculados por el equipo de Analítica a partir de los eventos que publicamos.
          </Text>
        </Box>
        <Button variant="default" leftSection={<IconRefresh size="1rem" />} onClick={() => { setLoading(true); load(); }} loading={loading}>
          Actualizar
        </Button>
      </Group>

      {error && <Alert color="yellow" mb="md">{error}</Alert>}

      {loading && !data && (
        <Group justify="center" py="xl"><Loader /></Group>
      )}

      {data && (
        <>
          {data.generatedAt && (
            <Text size="sm" c="dimmed" mb="sm">
              Generado el {new Date(data.generatedAt).toLocaleString('es-AR')}. Los indicadores se recalculan una vez por día y el informe, una vez por semana.
            </Text>
          )}
          <Card withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
            <iframe
              ref={frame}
              title="Analítica de Espacios Públicos y Cultura"
              srcDoc={data.html}
              sandbox="allow-scripts"
              style={{ width: '100%', height, border: 0, display: 'block' }}
            />
          </Card>
        </>
      )}
    </Box>
  );
}
