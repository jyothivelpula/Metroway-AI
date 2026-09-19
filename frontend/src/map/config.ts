export const MAP_STYLE_URL =
  (import.meta.env.VITE_MAP_STYLE_URL as string | undefined) ??
  "https://tiles.openfreemap.org/styles/liberty";

/** Public city center for the initial outdoor camera. Not a station coordinate. */
export const HYDERABAD_CENTER = {
  longitude: 78.4867,
  latitude: 17.385,
} as const;

export const HYDERABAD_ZOOM = 11;
export const STATION_ZOOM = 15;
