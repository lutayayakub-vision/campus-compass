import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const classesQuery = queryOptions({
  queryKey: ["classes"],
  queryFn: async () => {
    const { data, error } = await supabase.from("classes").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const buildingsQuery = queryOptions({
  queryKey: ["buildings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("buildings").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export function classMembersQuery(classId: string | null | undefined) {
  return queryOptions({
    queryKey: ["class-members", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("class_id", classId!);
      if (error) throw error;
      return data;
    },
  });
}

export function classLocationsQuery(userIds: string[]) {
  return queryOptions({
    queryKey: ["class-locations", [...userIds].sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
  });
}
