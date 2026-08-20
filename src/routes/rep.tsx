import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { CheckCircle2, MapPin, MessageSquare, Radio } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useClassLive } from "@/lib/useClassLive";
import { useGeoShare } from "@/lib/useGeoShare";
import { distanceMeters, timeAgo, type MapBuilding, type MapPerson } from "@/lib/campus";
import { AppHeader } from "@/components/AppHeader";
import { MapPanel } from "@/components/MapPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/rep")({
  head: () => ({
    meta: [
      { title: "Rep dashboard — Fresher Finder" },
      {
        name: "description",
        content:
          "Live map of every fresher in your Makerere class who is lost, where they're heading, and 1-on-1 chat to guide them.",
      },
      { property: "og:title", content: "Rep dashboard — Fresher Finder" },
      {
        property: "og:description",
        content: "See lost freshers live on a campus map and guide them building by building.",
      },
    ],
  }),
  component: RepPage,
});

const STATUS_CLASS: Record<string, string> = {
  lost: "bg-lost text-lost-foreground",
  guided: "bg-guided text-guided-foreground",
  found: "bg-found text-found-foreground",
};

function RepPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { members, locations, buildings } = useClassLive(profile?.class_id);
  const geo = useGeoShare(user?.id ?? null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/" });
    if (!loading && user && !profile?.class_id) void navigate({ to: "/onboarding" });
  }, [loading, user, profile, navigate]);

  const buildingById = useMemo(
    () => new Map(buildings.map((b) => [b.id, b])),
    [buildings],
  );

  const freshers = useMemo(() => {
    return members
      .filter((m) => m.role === "fresher")
      .map((m) => {
        const loc = locations.find((l) => l.user_id === m.id);
        return { profile: m, loc };
      })
      .sort((a, b) => {
        const rank = (s?: string) => (s === "lost" ? 0 : s === "guided" ? 1 : 2);
        const aSharing = a.loc?.sharing ? 0 : 1;
        const bSharing = b.loc?.sharing ? 0 : 1;
        if (aSharing !== bSharing) return aSharing - bSharing;
        return rank(a.loc?.status) - rank(b.loc?.status);
      });
  }, [members, locations]);

  const myLoc = geo.coords;

  const people = useMemo<MapPerson[]>(() => {
    const list: MapPerson[] = freshers
      .filter((f) => f.loc?.sharing)
      .map((f) => ({
        id: f.profile.id,
        name: f.profile.full_name || "Fresher",
        lat: f.loc!.lat,
        lng: f.loc!.lng,
        kind: "fresher" as const,
        status: f.loc!.status,
        target: f.profile.target_building_id
          ? (buildingById.get(f.profile.target_building_id)?.name ?? null)
          : null,
        updatedAt: f.loc!.updated_at,
      }));
    if (myLoc) {
      list.push({
        id: "me",
        name: profile?.full_name || "Me",
        lat: myLoc.lat,
        lng: myLoc.lng,
        kind: "me",
      });
    }
    return list;
  }, [freshers, myLoc, profile?.full_name, buildingById]);

  const mapBuildings = useMemo<MapBuilding[]>(
    () =>
      buildings.map((b) => ({
        id: b.id,
        name: b.name,
        lat: b.lat,
        lng: b.lng,
        highlighted: freshers.some(
          (f) => f.loc?.sharing && f.profile.target_building_id === b.id,
        ),
      })),
    [buildings, freshers],
  );

  async function setStatus(userId: string, status: "lost" | "guided" | "found") {
    const { error } = await supabase
      .from("locations")
      .update({ status })
      .eq("user_id", userId);
    if (error) toast.error(error.message);
    else toast.success(`Marked as ${status}`);
  }

  const activeCount = freshers.filter((f) => f.loc?.sharing).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader subtitle={`Class rep · ${activeCount} sharing location`} />

      <div className="h-[42vh] min-h-64 w-full">
        <MapPanel className="h-full w-full" people={people} buildings={mapBuildings} />
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-semibold">Freshers in your class</h1>
          <Button
            size="sm"
            variant={geo.sharing ? "secondary" : "outline"}
            onClick={() => (geo.sharing ? void geo.stop() : geo.start())}
          >
            <Radio className="mr-1.5 size-4" />
            {geo.sharing ? "Sharing my spot" : "Share my spot"}
          </Button>
        </div>

        {freshers.length === 0 ? (
          <p className="panel p-4 text-sm text-muted-foreground">
            No freshers have joined this class yet.
          </p>
        ) : null}

        {freshers.map(({ profile: f, loc }) => {
          const dest = f.target_building_id ? buildingById.get(f.target_building_id) : null;
          const dist =
            myLoc && loc?.sharing ? distanceMeters(myLoc, { lat: loc.lat, lng: loc.lng }) : null;
          return (
            <article key={f.id} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.full_name || "Fresher"}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0 text-accent" />
                    {dest ? `Wants ${dest.name}` : "No destination picked"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {loc?.sharing
                      ? `Live · updated ${timeAgo(loc.updated_at)}${dist !== null ? ` · ${dist} m from you` : ""}`
                      : "Not sharing location"}
                  </p>
                </div>
                <Badge className={STATUS_CLASS[loc?.status ?? "lost"]}>
                  {loc?.status ?? "lost"}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/chat/$peerId" params={{ peerId: f.id }}>
                    <MessageSquare className="mr-1.5 size-4" />
                    Message
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!loc}
                  onClick={() => void setStatus(f.id, "guided")}
                >
                  On my way
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!loc}
                  onClick={() => void setStatus(f.id, "found")}
                >
                  <CheckCircle2 className="mr-1.5 size-4" />
                  Found
                </Button>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}
