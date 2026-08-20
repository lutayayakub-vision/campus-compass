import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Coords = { lat: number; lng: number; accuracy: number | null };

const MIN_WRITE_MS = 8000;

/**
 * Watches the device GPS while `sharing` is on and pushes the position into
 * the `locations` table (throttled) so the class rep sees it live.
 */
export function useGeoShare(userId: string | null) {
  const [sharing, setSharing] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastWrite = useRef(0);

  const push = useCallback(
    async (c: Coords, force = false) => {
      if (!userId) return;
      const now = Date.now();
      if (!force && now - lastWrite.current < MIN_WRITE_MS) return;
      lastWrite.current = now;
      await supabase.from("locations").upsert(
        {
          user_id: userId,
          lat: c.lat,
          lng: c.lng,
          accuracy: c.accuracy,
          sharing: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    },
    [userId],
  );

  const stop = useCallback(async () => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
    if (userId) {
      await supabase.from("locations").update({ sharing: false }).eq("user_id", userId);
    }
  }, [userId]);

  const start = useCallback(() => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("This browser can't share location.");
      return;
    }
    setSharing(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        };
        setCoords(c);
        void push(c, lastWrite.current === 0);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser settings."
            : "Couldn't get your location. Try again outdoors.",
        );
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [push]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return { sharing, coords, error, start, stop };
}
