import { neighborhoodBoundaries } from "../catalogs/neighborhoodBoundaries";

function onSegment(x: number, y: number, a: number[], b: number[]): boolean {
  const cross = (x - a[0]) * (b[1] - a[1]) - (y - a[1]) * (b[0] - a[0]);
  return Math.abs(cross) < 1e-12 && x >= Math.min(a[0], b[0]) - 1e-12 &&
    x <= Math.max(a[0], b[0]) + 1e-12 && y >= Math.min(a[1], b[1]) - 1e-12 &&
    y <= Math.max(a[1], b[1]) + 1e-12;
}

function inRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (onSegment(x, y, a, b)) return true;
    if ((a[1] > y) !== (b[1] > y) &&
      x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

// Devuelve barrios que contienen los puntos consultados. No extrapola el área de una tormenta.
export function resolveWeatherNeighborhoods(locations: Array<{ latitude: number; longitude: number }>): string[] {
  const names = new Set<string>();
  for (const { latitude, longitude } of locations) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    for (const region of neighborhoodBoundaries) {
      if (region.polygons.some((rings) => inRing(longitude, latitude, rings[0]) &&
        !rings.slice(1).some((hole) => inRing(longitude, latitude, hole)))) names.add(region.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
