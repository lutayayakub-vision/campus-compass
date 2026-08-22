import { Suspense, lazy } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { MapBuilding, MapPerson, MapRoute } from "@/lib/campus";

const CampusMap = lazy(() => import("./CampusMap"));

export type MapPanelProps = {
  people: MapPerson[];
  buildings: MapBuilding[];
  routes?: MapRoute[] | null;
  fitTo?: Array<[number, number]>;
  highlightedBuildingIds?: string[];
  centerOn?: [number, number] | null;
  onCentered?: () => void;
  onSelectPerson?: (id: string) => void;
  className?: string;
};


function Skeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading campus map…
    </div>
  );
}

export function MapPanel({ className, ...props }: MapPanelProps) {
  return (
    <div className={className ?? "h-full w-full overflow-hidden rounded-xl border"}>
      <ClientOnly fallback={<Skeleton />}>
        <Suspense fallback={<Skeleton />}>
          <CampusMap {...props} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
