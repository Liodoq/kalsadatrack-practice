import L from 'leaflet';
import type { ReportStatus } from '../lib/types';

const cache = new Map<string, L.DivIcon>();

/** Colored dot marker (avoids Leaflet's default image icons, which break under Vite). */
export function pinIcon(status: ReportStatus, verified: boolean, active = false): L.DivIcon {
  const key = `${status}-${verified}-${active}`;
  let icon = cache.get(key);
  if (!icon) {
    const size = active ? 30 : 22;
    icon = L.divIcon({
      className: 'pin-wrap',
      html: `<span class="pin pin-${status}${verified ? ' pin-verified' : ''}${active ? ' pin-active' : ''}"></span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    cache.set(key, icon);
  }
  return icon;
}

export const dropPin = L.divIcon({
  className: 'pin-wrap',
  html: '<span class="pin pin-drop"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});
