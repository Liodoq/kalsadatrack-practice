import type { City } from './types';

// Must match the bounds in supabase/migrations/0007_rules.sql
export const NCR_BOUNDS = { minLat: 14.33, maxLat: 14.8, minLng: 120.9, maxLng: 121.14 };
export const NCR_CENTER: [number, number] = [14.5995, 121.0244];
export const NCR_MAX_BOUNDS: [[number, number], [number, number]] = [
  [14.2, 120.75],
  [14.95, 121.3],
];

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function insideNcr(lat: number, lng: number): boolean {
  return lat >= NCR_BOUNDS.minLat && lat <= NCR_BOUNDS.maxLat && lng >= NCR_BOUNDS.minLng && lng <= NCR_BOUNDS.maxLng;
}

/** Great-circle distance in meters. */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestCity(cities: City[], lat: number, lng: number): City | undefined {
  let best: City | undefined;
  let bestD = Infinity;
  for (const c of cities) {
    const d = distanceMeters(lat, lng, c.lat, c.lng);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}
