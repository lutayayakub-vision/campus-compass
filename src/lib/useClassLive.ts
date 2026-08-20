import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildingsQuery, classLocationsQuery, classMembersQuery } from "./data";

/** Class members + their latest shared locations, kept live via Realtime. */
export function useClassLive(classId: string | null | undefined) {
  const qc = useQueryClient();
  const members = useQuery(classMembersQuery(classId));
  const buildings = useQuery(buildingsQuery);

  const memberIds = useMemo(() => (members.data ?? []).map((m) => m.id), [members.data]);
  const locations = useQuery(classLocationsQuery(memberIds));

  useEffect(() => {
    if (!classId) return;
    const channel = supabase
      .channel(`class-${classId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, () => {
        void qc.invalidateQueries({ queryKey: ["class-locations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void qc.invalidateQueries({ queryKey: ["class-members"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [classId, qc]);

  // Safety net for missed realtime events on flaky mobile data.
  useEffect(() => {
    const t = setInterval(() => {
      void qc.invalidateQueries({ queryKey: ["class-locations"] });
      void qc.invalidateQueries({ queryKey: ["class-members"] });
    }, 6000);
    return () => clearInterval(t);
  }, [qc]);


  return {
    members: members.data ?? [],
    locations: locations.data ?? [],
    buildings: buildings.data ?? [],
    loading: members.isLoading || buildings.isLoading,
  };
}
