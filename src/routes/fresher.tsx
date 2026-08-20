import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { MessageSquare, Navigation, Radio } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useClassLive } from "@/lib/useClassLive";
import { useGeoShare } from "@/lib/useGeoShare";
import { distanceMeters, type MapBuilding, type MapPerson } from "@/lib/campus";
import { AppHeader } from "@/components/AppHeader";
import { MapPanel } from "@/components/MapPanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    toast.success("Destination shared with your rep");
  }

  const distance = me && target ? distanceMeters(me, target) : null;
  const status = myLoc?.status ?? "lost";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader subtitle={profile?.full_name ?? undefined} />

      <div className="h-[42vh] min-h-64 w-full">
        <MapPanel
          className="h-full w-full"
          people={people}
          buildings={mapBuildings}
          route={
            me && target
              ? { from: [me.lat, me.lng], to: [target.lat, target.lng] }
              : null
          }
          fitTo={[
            ...people.map((p) => [p.lat, p.lng] as [number, number]),
            ...(target ? [[target.lat, target.lng] as [number, number]] : []),
          ]}
        />
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4">
        <section className="panel p-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Where are you trying to reach?
          </Label>
          <Select value={profile?.target_building_id ?? ""} onValueChange={setTarget}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Pick a lecture building" />
            </SelectTrigger>
            <SelectContent>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {distance !== null ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Navigation className="size-4 text-accent" />
              About {distance} m away in a straight line
            </p>
          ) : null}
        </section>

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
