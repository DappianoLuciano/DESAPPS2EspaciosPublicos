export interface AddressMatch {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  zone: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseAddressMatches(data: unknown): AddressMatch[] {
  if (!Array.isArray(data)) throw new Error('El servicio de direcciones devolvió una respuesta inválida.');
  return data.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const latitude = text(item.lat) ? Number(item.lat) : NaN;
    const longitude = text(item.lon) ? Number(item.lon) : NaN;
    const label = text(item.display_name);
    if (!label || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
        !Number.isFinite(longitude) || Math.abs(longitude) > 180) return [];
    const address = item.address || {};
    const zone = [address.suburb, address.neighbourhood, address.city_district,
      address.city, address.town, address.village].map(text).find(Boolean) || '';
    return [{ id: String(index), label, latitude, longitude, zone }];
  });
}

// Solo para búsquedas explícitas: no consultar el servicio mientras se escribe.
// La instancia se comparte en el formulario para cachear y limitar consultas repetidas.
export function createAddressSearch(fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { expiresAt: number; matches: AddressMatch[] }>();
  let lastRequestAt = -Infinity;
  return async (query: string, signal?: AbortSignal,
    endpoint = 'https://nominatim.openstreetmap.org/search'): Promise<AddressMatch[]> => {
    const value = query.trim();
    if (value.length < 3) throw new Error('Ingresá calle, altura y localidad para ubicar el espacio.');
    signal?.throwIfAborted();
    const key = endpoint + ':' + value.toLocaleLowerCase();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now()) return cached.matches;
    if (now() - lastRequestAt < 1000) throw new Error('Esperá un segundo antes de buscar otra dirección.');
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ q: value, format: 'json', addressdetails: '1',
      limit: '6', countrycodes: 'ar', 'accept-language': 'es' }).toString();
    const timeout = AbortSignal.timeout(10_000);
    lastRequestAt = now();
    let response: Response;
    try {
      response = await fetcher(url.toString(), {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: { Accept: 'application/json' },
        referrerPolicy: 'strict-origin-when-cross-origin',
      });
    } catch {
      signal?.throwIfAborted();
      throw new Error('No se pudo consultar la dirección. Intentá nuevamente en unos instantes.');
    }
    if (!response.ok) throw new Error('El servicio de direcciones no está disponible. Intentá nuevamente.');
    const matches = parseAddressMatches(await response.json());
    signal?.throwIfAborted();
    if (cache.size >= 50) cache.delete(cache.keys().next().value!);
    cache.set(key, { expiresAt: now() + 5 * 60_000, matches });
    return matches;
  };
}
