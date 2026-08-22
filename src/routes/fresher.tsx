import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Navigation, Radio, ChevronsUp, ChevronsDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useClassLive } from "@/lib/useClassLive";
import { useGeoShare } from "@/lib/useGeoShare";
import { type MapBuilding, type MapPerson, type MapRoute } from "@/lib/campus";
import { useRoute } from "@/lib/useRoute";
import { formatDuration, estimateWalkSeconds } from "@/lib/routing";
import { AppHeader } from "@/components/AppHeader";
import { MapPanel } from "@/components/MapPanel";
import { BuildingPicker } from "@/components/BuildingPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fresher")({
  head: () => ({
    meta: [
      { title: "I'm lost — Fresher Finder" },
      {
        name: "description",
        content:
          "Share your live location with your Makerere class rep, pick the lecture building you need and chat until you're found.",
      },
      { property: "og:title", content: "I'm lost — Fresher Finder" },
      {
        property: "og:description",
        content:
          "Share your live location with your class rep and get guided to the right lecture building.",
      },
    ],
  }),
  component: FresherPage,
});

function FresherPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { members, locations, buildings } = useClassLive(profile?.class_id);
  const geo = useGeoShare(user?.id ?? null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/" });
    if (!loading && user && !profile?.class_id) void navigate({ to: "/onboarding" });
  }, [loading, user, profile, navigate]);

  const rep = members.find((m) => m.role === "rep");
  const repLoc = locations.find((l) => l.user_id === rep?.id && l.sharing);
  const myLoc = locations.find((l) => l.user_id === user?.id);
  const target = buildings.find((b) => b.id === profile?.target_building_id);

  const me = geo.coords ?? (myLoc ? { lat: myLoc.lat, lng: myLoc.lng } : null);

  const repPoint = repLoc ? { lat: repLoc.lat, lng: repLoc.lng } : null;
  const targetPoint = target ? { lat: target.lat, lng: target.lng } : null;
  const meeting = useRoute(repPoint, me);
  const destination = useRoute(me, targetPoint);

  const people = useMemo<MapPerson[]>(() => {
    const list: MapPerson[] = [];
    if (me) {
      list.push({
        id: "me",
        name: profile?.full_name || "Me",
        lat: me.lat,
        lng: me.lng,
        kind: "me",
      });
    }
    if (repLoc && rep) {
      list.push({
        id: rep.id,
        name: `${rep.full_name} (rep)`,
        lat: repLoc.lat,
        lng: repLoc.lng,
        kind: "rep",
      });
    }
    return list;
  }, [me, repLoc, rep, profile?.full_name]);

  const [searchQuery, setSearchQuery] = useState("");
  const [centerOn, setCenterOn] = useState<[number, number] | null>(null);

  const highlightedBuildingIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return buildings.filter((b) => b.name.toLowerCase().includes(q)).map((b) => b.id);
  }, [buildings, searchQuery]);

  const mapBuildings = useMemo<MapBuilding[]>(
    () =>
      buildings.map((b) => ({
        id: b.id,
        name: b.name,
        lat: b.lat,
        lng: b.lng,
        highlighted: b.id === profile?.target_building_id,
      })),
    [buildings, profile?.target_building_id],
  );

  const [pickerExpanded, setPickerExpanded] = useState(false);

  const [mapFocused, setMapFocused] = useState(false);
  const pickerOpen = !target || pickerExpanded;

  async function setTarget(id: string) {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ target_building_id: id })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    setPickerExpanded(false);
    const selected = buildings.find((b) => b.id === id);
    if (selected) setCenterOn([selected.lat, selected.lng]);
    toast.success("Destination shared with your rep");
  }


  const status = myLoc?.status ?? "lost";

  const meetTime =
    repPoint && me
      ? formatDuration(meeting.data?.duration ?? estimateWalkSeconds(repPoint, me))
      : null;
  const destTime =
    me && targetPoint
      ? formatDuration(destination.data?.duration ?? estimateWalkSeconds(me, targetPoint))
      : null;

  const mapRoutes: MapRoute[] = [];
  if (repPoint && me) {
    mapRoutes.push({
      from: [repPoint.lat, repPoint.lng],
      to: [me.lat, me.lng],
      path: meeting.data?.path ?? null,
      color: "#2563eb",
      weight: 4,
    });
  }
  if (me && targetPoint) {
    mapRoutes.push({
      from: [me.lat, me.lng],
      to: [targetPoint.lat, targetPoint.lng],
      path: destination.data?.path ?? null,
      color: "#2563eb",
      dashArray: "6 8",
      weight: 3,
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader subtitle={profile?.full_name ?? undefined} />

      <div
        className={
          "relative w-full " +
          (mapFocused ? "min-h-64 flex-1" : "h-[42vh] min-h-64")
        }
        onClick={() => {
          if (!mapFocused) setMapFocused(true);
        }}
      >
        <MapPanel
          className="h-full w-full"
          people={people}
          buildings={mapBuildings}
          routes={mapRoutes}
          highlightedBuildingIds={highlightedBuildingIds}
          centerOn={centerOn}
          onCentered={() => setCenterOn(null)}
          fitTo={[
            ...people.map((p) => [p.lat, p.lng] as [number, number]),
            ...(target ? [[target.lat, target.lng] as [number, number]] : []),
          ]}
        />

        {mapFocused ? (
          <button
            type="button"
            aria-label="Show destination panel"
            onClick={(e) => {
              e.stopPropagation();
              setMapFocused(false);
            }}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow-lg ring-1 ring-border backdrop-blur"
          >
            Destination
            <ChevronsDown className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4">
        {!mapFocused ? (
          <section className="panel overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setPickerExpanded((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPickerExpanded((v) => !v);
                }
              }}
              className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left"
            >
              <div className="min-w-0">
                {!pickerOpen ? (
                  <>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Destination
                    </Label>
                    <p className="truncate font-medium">{target?.name}</p>
                    {destTime ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Navigation className="size-4 text-accent" />
                        About {destTime} walk
                      </p>
                    ) : null}
                  </>
                ) : (
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Where are you trying to reach?
                  </Label>
                )}
              </div>
              <ChevronsUp
                className={cn(
                  "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
                  pickerOpen && "rotate-180",
                )}
              />
            </div>

            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                pickerOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4">
                  <BuildingPicker
                    buildings={buildings}
                    value={profile?.target_building_id ?? null}
                    onSelect={setTarget}
                    onSearch={setSearchQuery}
                    placeholder="Pick a lecture building"
                  />

                  {destTime && target ? (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Navigation className="size-4 text-accent" />
                      About {destTime} walk to {target.name}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {!mapFocused && (
        <section className="panel p-4">
          {geo.sharing ? (
            <>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Radio className="size-4 animate-pulse text-lost" />
                Sharing your live location
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Status: <span className="font-medium">{status}</span>
                {geo.coords?.accuracy
                  ? ` · accuracy ±${Math.round(geo.coords.accuracy)} m`
                  : ""}
              </p>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => void geo.stop()}
              >
                Stop sharing
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" className="h-14 w-full text-base" onClick={geo.start}>
                I&apos;m lost — share my location
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Your rep sees your live pin until you stop sharing.
              </p>
            </>
          )}
          {geo.error ? (
            <p className="mt-2 text-sm text-destructive">{geo.error}</p>
          ) : null}
        </section>
        )}

        <section className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Your class rep
          </p>
          {rep ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{rep.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {repLoc ? "On the map now" : "Location not shared"}
                </p>
                {repLoc && meetTime ? (
                  <p className="text-xs text-muted-foreground">
                    Can reach you in ~{meetTime}
                  </p>
                ) : null}
              </div>
              <Button asChild>
                <Link to="/chat/$peerId" params={{ peerId: rep.id }}>
                  <MessageSquare className="mr-1.5 size-4" />
                  Chat
                </Link>
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No rep has signed up for your class yet.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
