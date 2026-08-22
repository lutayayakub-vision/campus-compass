import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, Polyline } from "react-leaflet";
import {
  CAMPUS_CENTER,
  CAMPUS_BOUNDS,
  type MapBuilding,
  type MapPerson,
  type MapRoute,
} from "@/lib/campus";

function pin(className: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div class="ff-pin ${className}">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0]!, 17);
      return;
    }
    map.fitBounds(L.latLngBounds(points).pad(0.25), { animate: true });
  }, [map, JSON.stringify(points)]);
  return null;
}

function CenterOn({
  center,
  onDone,
}: {
  center: [number, number];
  onDone: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 18, { animate: true, duration: 1 });
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [map, `${center[0]},${center[1]}`, onDone]);
  return null;
}

export type CampusMapProps = {
  people: MapPerson[];
  buildings: MapBuilding[];
  routes?: MapRoute[] | null;
  fitTo?: Array<[number, number]>;
  highlightedBuildingIds?: string[];
  centerOn?: [number, number] | null;
  onCentered?: () => void;
  onSelectPerson?: (id: string) => void;
};

export default function CampusMap({
  people,
  buildings,
  routes,
  fitTo,
  highlightedBuildingIds,
  centerOn,
  onCentered,
  onSelectPerson,
}: CampusMapProps) {
  const fitPoints = useMemo(
    () => fitTo ?? people.map((p) => [p.lat, p.lng] as [number, number]),
    [fitTo, people],
  );

  return (
    <MapContainer
      center={CAMPUS_CENTER}
      zoom={16}
      scrollWheelZoom
      maxBounds={CAMPUS_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={15}
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FitBounds points={fitPoints} />
      {centerOn ? <CenterOn center={centerOn} onDone={() => onCentered?.()} /> : null}

      {buildings.map((b) => {
        const highlighted = b.highlighted || highlightedBuildingIds?.includes(b.id);
        return (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={pin(`ff-pin--building${highlighted ? " ff-pin--target" : ""}`, "\u25B2")}
          >
            <Popup>
              <strong>{b.name}</strong>
              {highlighted ? <div>{b.highlighted ? "Destination" : "Match"}</div> : null}
            </Popup>
          </Marker>
        );
      })}

      {people.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pin(
            p.kind === "me"
              ? "ff-pin--me"
              : p.kind === "rep"
                ? ""
                : `ff-pin--${p.status ?? "lost"}`,
            initials(p.name),
          )}
          eventHandlers={{ click: () => onSelectPerson?.(p.id) }}
        >
          <Popup>
            <strong>{p.name}</strong>
            {p.target ? <div>Heading to: {p.target}</div> : null}
            {p.status ? <div>Status: {p.status}</div> : null}
          </Popup>
        </Marker>
      ))}

      {routes?.map((r, i) => (
        <Polyline
          key={i}
          positions={r.path && r.path.length > 1 ? r.path : [r.from, r.to]}
          pathOptions={{
            color: r.color ?? "#b8860b",
            dashArray: r.dashArray,
            weight: r.weight ?? 3,
          }}
        />
      ))}
    </MapContainer>
  );
}
