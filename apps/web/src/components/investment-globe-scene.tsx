"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import { Mesh, MeshBasicMaterial, MeshPhongMaterial, TorusGeometry } from "three";
import landTopology from "world-atlas/land-110m.json";

import { countryLocation, type GeographyItem } from "@/lib/investment-geography";

const landCollection = feature(landTopology as never, (landTopology as never as { objects: { land: never } }).objects.land) as unknown as { features: Array<{ geometry: object }> };
const land = landCollection.features[0];

type Point = { lat: number; lng: number; countryCode: string; itemIds: string[]; label: string; selected: boolean; weight: number };
type Orbit = { scope: "global" | "unattributed"; itemIds: string[]; selected: boolean };

export default function InvestmentGlobeScene({ items, selectedId, activityToken, onSelect }: { items: GeographyItem[]; selectedId?: string; activityToken: number; onSelect: (id: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSelectedId = useRef(selectedId);
  const previousActivityToken = useRef(activityToken);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ width: 520, height: 360 });
  const material = useMemo(() => new MeshPhongMaterial({ color: "#0b2226", shininess: 10, specular: "#1b4144" }), []);
  const orbits = useMemo(() => (["global", "unattributed"] as const).map((scope) => ({
    scope,
    itemIds: items.filter((item) => item.scope === scope || (scope === "unattributed" && item.scope === "country" && !countryLocation(item.countryCode))).map((item) => item.id),
    selected: items.some((item) => item.id === selectedId && (item.scope === scope || (scope === "unattributed" && item.scope === "country" && !countryLocation(item.countryCode)))),
  })).filter((orbit) => orbit.itemIds.length > 0), [items, selectedId]);
  const points = useMemo(() => {
    const grouped = new Map<string, Point>();
    for (const item of items) {
      const countryCode = item.countryCode?.toUpperCase();
      const location = countryLocation(countryCode);
      if (!countryCode || !location) continue;
      const point = grouped.get(countryCode) ?? { lat: location.lat, lng: location.lng, countryCode, itemIds: [], label: location.name, selected: false, weight: 0 };
      point.itemIds.push(item.id);
      point.weight += item.value ?? 1;
      point.selected ||= item.id === selectedId;
      grouped.set(countryCode, point);
    }
    return [...grouped.values()];
  }, [items, selectedId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.max(280, Math.round(entry.contentRect.width)), height: Math.max(300, Math.round(entry.contentRect.height)) }));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const item = items.find((entry) => entry.id === selectedId);
    const location = countryLocation(item?.countryCode);
    if (location) globeRef.current?.pointOfView({ lat: location.lat, lng: location.lng, altitude: 1.8 }, 650);
  }, [items, selectedId]);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.enableZoom = size.width >= 520;
      controls.enableRotate = size.width >= 520;
    }
  }, [size.width]);

  const resumeAfterIdle = useCallback(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      idleTimerRef.current = null;
    }, 10_000);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotateSpeed = 0.28;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pause = () => {
      controls.autoRotate = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    };
    controls.addEventListener("start", pause);
    controls.addEventListener("end", resumeAfterIdle);
    return () => {
      controls.removeEventListener("start", pause);
      controls.removeEventListener("end", resumeAfterIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      controls.autoRotate = false;
    };
  }, [ready, resumeAfterIdle]);

  useEffect(() => {
    if (previousSelectedId.current === selectedId && previousActivityToken.current === activityToken) return;
    previousSelectedId.current = selectedId;
    previousActivityToken.current = activityToken;
    resumeAfterIdle();
  }, [activityToken, selectedId, resumeAfterIdle]);

  return <div ref={hostRef} onPointerDownCapture={resumeAfterIdle} onWheelCapture={resumeAfterIdle} className="absolute inset-0 [&_canvas]:cursor-grab [&_canvas]:touch-pan-y [&_canvas:active]:cursor-grabbing">
    <Globe ref={globeRef} width={size.width} height={size.height} backgroundColor="rgba(0,0,0,0)" globeMaterial={material}
      showGraticules showAtmosphere atmosphereColor="#69d8d7" atmosphereAltitude={0.12}
      polygonsData={[land]} polygonGeoJsonGeometry={(polygon) => (polygon as typeof land).geometry as never}
      polygonCapColor={() => "#25565a"} polygonSideColor={() => "#15373b"} polygonStrokeColor={() => "#36656a"}
      polygonAltitude={0.005} polygonsTransitionDuration={0}
      pointsData={points} pointLat="lat" pointLng="lng" pointAltitude={(point) => (point as Point).selected ? 0.075 : 0.035}
      pointRadius={(point) => (point as Point).selected ? 0.95 : 0.65} pointColor={(point) => (point as Point).selected ? "#e9ffff" : "#84e6df"}
      pointLabel={(point) => { const p = point as Point; return `${p.label} · ${p.itemIds.length} asset${p.itemIds.length === 1 ? "" : "s"}`; }}
      onPointClick={(point) => onSelect((point as Point).itemIds[0])}
      customLayerData={orbits}
      customThreeObject={(datum) => {
        const orbit = datum as Orbit;
        const mesh = new Mesh(
          new TorusGeometry(orbit.scope === "global" ? 112 : 118, orbit.selected ? 0.9 : 0.55, 6, 128),
          new MeshBasicMaterial({ color: orbit.scope === "global" ? "#7be4de" : "#e6bd79", transparent: true, opacity: orbit.selected ? 0.86 : 0.57 }),
        );
        mesh.rotation.x = orbit.scope === "global" ? 0.42 : -0.66;
        mesh.rotation.y = orbit.scope === "global" ? 0.16 : -0.34;
        return mesh;
      }}
      onCustomLayerClick={(datum) => onSelect((datum as Orbit).itemIds[0])}
      onGlobeReady={() => { const chosen = items.find((item) => item.id === selectedId) ?? items[0]; const location = countryLocation(chosen?.countryCode); globeRef.current?.pointOfView({ lat: location?.lat ?? 17, lng: location?.lng ?? 10, altitude: 2.1 }, 0); const controls = globeRef.current?.controls(); if (controls) { controls.enablePan = false; controls.enableZoom = size.width >= 520; controls.enableRotate = size.width >= 520; controls.minDistance = 135; controls.maxDistance = 420; } setReady(true); }} />
  </div>;
}
