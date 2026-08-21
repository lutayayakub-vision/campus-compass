import { distanceMeters } from "./campus";

export type RouteResult = {
  /** Ordered [lat, lng] points following walkable streets. */
  path: Array<[number, number]>;
  /** Travel time in seconds. */
  duration: number;
  /** Travel distance in metres. */
  distance: number;
};

const WALK_MPS = 1.4; // ~5 km/h

/**
 * Fetches a walking route between two points from the free, key-less OSRM
 * public demo server (OpenStreetMap data). Returns null on any failure so
 * callers can fall back to a straight-line estimate.
 */
export async function getWalkingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      code?: string;
      routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> }; duration?: number; distance?: number }>;
    };
    const route = json.routes?.[0];
    if (!route) return null;
    // OSRM returns [lng, lat]; Leaflet wants [lat, lng].
    const path: Array<[number, number]> = (route.geometry?.coordinates ?? []).map(
      ([lng, lat]) => [lat, lng],
    );
    if (path.length < 2) return null;
    return {
      path,
      duration: route.duration ?? 0,
      distance: Math.round(route.distance ?? 0),
    };
  } catch {
    return null;
  }
}

/** Rough ETA fallback (straight-line distance / walking speed) when routing fails. */
export function estimateWalkSeconds(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  return distanceMeters(from, to) / WALK_MPS;
}

export function formatDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
