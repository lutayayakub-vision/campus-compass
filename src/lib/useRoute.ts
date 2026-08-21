import { useQuery } from "@tanstack/react-query";
import { getWalkingRoute, type RouteResult } from "./routing";

export type RoutePoint = { lat: number; lng: number };

/** Round to ~11 m so small GPS jitter doesn't refetch the route every tick. */
const round = (n: number) => Math.round(n * 1e4) / 1e4;

/**
 * Fetches a walking route between two points, cached by rounded coordinates.
 * Pass null for either endpoint to disable the query.
 */
export function useRoute(from: RoutePoint | null, to: RoutePoint | null) {
  const a = from ? { lat: round(from.lat), lng: round(from.lng) } : null;
  const b = to ? { lat: round(to.lat), lng: round(to.lng) } : null;
  const key = a && b ? `${a.lat},${a.lng}|${b.lat},${b.lng}` : null;

  return useQuery<RouteResult | null>({
    queryKey: ["walking-route", key],
    enabled: !!key,
    staleTime: 20_000,
    queryFn: () => (a && b ? getWalkingRoute(a, b) : Promise.resolve(null)),
  });
}
