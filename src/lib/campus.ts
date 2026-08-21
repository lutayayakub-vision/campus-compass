export const CAMPUS_CENTER: [number, number] = [0.3324, 32.5692];

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  return `${Math.round(secs / 3600)}h ago`;
}

export type MapPerson = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "me" | "fresher" | "rep";
  status?: "lost" | "guided" | "found";
  target?: string | null;
  updatedAt?: string;
};

export type MapBuilding = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  highlighted?: boolean;
};

export type MapRoute = {
  from: [number, number];
  to: [number, number];
  /** Walkable path; falls back to a straight line from→to when unavailable. */
  path?: Array<[number, number]> | null;
  color?: string;
  dashArray?: string;
  weight?: number;
};
