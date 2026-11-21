"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { Pause, RotateCw } from "lucide-react";
import { feature } from "topojson-client";
import { MeshPhongMaterial } from "three";
import countryTopology from "world-atlas/countries-110m.json";

import { Button } from "@/components/ui/button";
import { countryLocation, type GeographyItem } from "@/lib/investment-geography";
import { countryCodeForMap, countryRegion, globeAnnotationItems, globeRegions, groupGeography, type GlobeRegion } from "@/lib/investment-globe-data";

type CountryPolygon = { geometry: object; properties: { name: string }; countryCode?: string };
const countryCollection = feature(countryTopology as never, (countryTopology as never as { objects: { countries: never } }).objects.countries) as unknown as { features: CountryPolygon[] };
const polygons = countryCollection.features.map((polygon) => ({ ...polygon, countryCode: countryCodeForMap(polygon.properties.name) }));

type Props = { items: GeographyItem[]; selectedId?: string; region: GlobeRegion; activityToken: number; onSelect: (id: string) => void; onUnavailable: () => void };
type Point = { lat: number; lng: number; countryCode: string; itemIds: string[]; name: string; selected: boolean; items: GeographyItem[] };

export default function InvestmentGlobeScene({ items, selectedId, region, activityToken, onSelect, onUnavailable }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const mountedRef = useRef(false);
  const globeReadyRef = useRef(false);
  const readyFrameRef = useRef<number | null>(null);
  const cameraFrameRef = useRef<number | null>(null);
  const cameraPositionedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [rotationRequest, setRotationRequest] = useState<{ region: GlobeRegion; selectedId?: string; activityToken: number } | null>(null);
  const spinning = rotationRequest !== null && rotationRequest.region === region && rotationRequest.selectedId === selectedId && rotationRequest.activityToken === activityToken;
  const [size, setSize] = useState({ width: 520, height: 544 });
  const material = useMemo(() => new MeshPhongMaterial({ color: "#020609", shininess: 0, specular: "#000000" }), []);
  const groups = useMemo(() => groupGeography(items), [items]);
  const points = useMemo(() => groups.flatMap((group): Point[] => {
    const location = countryLocation(group.countryCode);
    if (!location || !group.countryCode || (region !== "global" && countryRegion(group.countryCode) !== region)) return [];
    return [{ lat: location.lat, lng: location.lng, countryCode: group.countryCode, itemIds: group.items.map((item) => item.id), name: group.name, selected: group.items.some((item) => item.id === selectedId), items: group.items }];
  }), [groups, region, selectedId]);
  const unlocatedSelection = groups.some((group) => !group.countryCode && group.items.some((item) => item.id === selectedId));
  const focusPoint = unlocatedSelection ? undefined : points.find((point) => point.selected) ?? points[0];
  const annotation = focusPoint ? [focusPoint] : [];
  const mappedCodes = new Set(points.map((point) => point.countryCode));
  const selectedCode = focusPoint?.countryCode;
  const focusLat = focusPoint?.lat;
  const focusLng = focusPoint?.lng;
  const focusSelected = focusPoint?.selected;

  // react-kapsule may invoke this while constructing a discarded render instance.
  // Latch early readiness and deliver it only after commit on a cancellable frame.
  const handleGlobeReady = useCallback(() => {
    globeReadyRef.current = true;
    if (!mountedRef.current) return;
    if (readyFrameRef.current !== null) cancelAnimationFrame(readyFrameRef.current);
    readyFrameRef.current = requestAnimationFrame(() => {
      readyFrameRef.current = null;
      if (mountedRef.current) setReady(true);
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (globeReadyRef.current) handleGlobeReady();
    return () => {
      mountedRef.current = false;
      if (readyFrameRef.current !== null) cancelAnimationFrame(readyFrameRef.current);
      readyFrameRef.current = null;
    };
  }, [handleGlobeReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.max(1, Math.round(entry.contentRect.width)), height: Math.max(1, Math.round(entry.contentRect.height)) }));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  const cancelCameraMove = useCallback(() => {
    if (cameraFrameRef.current !== null) cancelAnimationFrame(cameraFrameRef.current);
    cameraFrameRef.current = null;
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    const view = globeRegions.find((entry) => entry.id === region)!;
    const target = focusLat !== undefined && focusLng !== undefined && (focusSelected || region === "global") ? { lat: focusLat, lng: focusLng + 14 } : view;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Fit the sphere to the shorter edge, including narrow portrait screens.
    const altitude = Math.max(1.65, (size.height / size.width) * 2.0);
    if (reduced || !cameraPositionedRef.current) {
      globe.pointOfView({ lat: target.lat, lng: target.lng, altitude });
      cameraPositionedRef.current = true;
      return;
    }

    // Globe's built-in transition jumps to the prior destination when interrupted.
    // Start each move from the actual camera and let manual drag cancel it.
    const start = globe.pointOfView();
    const longitudeDelta = (((target.lng - start.lng + 180) % 360 + 360) % 360) - 180;
    const startedAt = performance.now();
    const move = (now: number) => {
      const progress = Math.min((now - startedAt) / 650, 1);
      const eased = 1 - (1 - progress) ** 3;
      globe.pointOfView({
        lat: start.lat + (target.lat - start.lat) * eased,
        lng: start.lng + longitudeDelta * eased,
        altitude: start.altitude + (altitude - start.altitude) * eased,
      });
      cameraFrameRef.current = progress < 1 ? requestAnimationFrame(move) : null;
    };
    cameraFrameRef.current = requestAnimationFrame(move);
    return cancelCameraMove;
  }, [ready, region, selectedId, activityToken, focusLat, focusLng, focusSelected, size.width, size.height, cancelCameraMove]);

  useEffect(() => {
    if (!ready) return;
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.enablePan = false;
    // One-finger scrolling stays native on phones; region/asset controls rotate the view.
    // Wheel gestures belong to the page, never an unexpected globe zoom.
    controls.enableZoom = false;
    // OrbitControls writes an inline touch-action:none, overriding canvas CSS.
    if (controls.domElement) controls.domElement.style.touchAction = "pan-y";
    controls.minDistance = 190;
    controls.maxDistance = 450;
    controls.autoRotateSpeed = 0.32;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const update = () => {
      controls.autoRotate = spinning && !media.matches;
      controls.enableRotate = size.width >= 520 && !coarsePointer.matches;
    };
    const pause = () => setRotationRequest(null);
    update();
    media.addEventListener("change", update);
    coarsePointer.addEventListener("change", update);
    controls.addEventListener("start", pause);
    return () => { media.removeEventListener("change", update); coarsePointer.removeEventListener("change", update); controls.removeEventListener("start", pause); controls.autoRotate = false; };
  }, [ready, spinning, size.width]);

  useEffect(() => {
    if (!ready) return;
    const canvas = globeRef.current?.renderer().domElement;
    if (!canvas) return;
    const lost = (event: Event) => {
      event.preventDefault();
      if (mountedRef.current) onUnavailable();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [ready, onUnavailable]);

  // Labels are created with textContent because provider symbols are untrusted text.
  const annotationElement = useCallback((datum: object) => {
    const point = datum as Point;
    const label = document.createElement("div");
    label.className = "pointer-events-none ml-14 w-max sm:ml-28 max-w-36 rounded-xl bg-popover/95 px-3 py-2.5 text-xs text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]";
    label.setAttribute("aria-hidden", "true");
    const name = document.createElement("p");
    name.className = "mb-1.5 max-w-32 truncate text-[0.65rem] text-zinc-300";
    name.textContent = point.name;
    label.appendChild(name);
    for (const item of globeAnnotationItems(point.items, selectedId)) {
      const row = document.createElement("p");
      row.className = "flex items-center justify-between gap-2 py-0.5";
      const symbol = document.createElement("span");
      symbol.className = "min-w-0 max-w-20 truncate font-medium";
      symbol.textContent = item.label;
      row.appendChild(symbol);
      if (Number.isFinite(item.dailyChangePercent)) {
        const change = document.createElement("span");
        change.className = `shrink-0 whitespace-nowrap font-mono tabular-nums ${item.dailyChangePercent! >= 0 ? "text-emerald-300" : "text-rose-300"}`;
        change.textContent = `${item.dailyChangePercent! >= 0 ? "+" : ""}${item.dailyChangePercent!.toFixed(2)}%`;
        row.appendChild(change);
      }
      label.appendChild(row);
    }
    if (point.items.length > 3) {
      const more = document.createElement("p");
      more.className = "mt-1 text-[0.65rem] text-zinc-300";
      more.textContent = `+${point.items.length - 3} more assets`;
      label.appendChild(more);
    }
    return label;
  }, [selectedId]);

  function stopRotation() {
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = false;
    setRotationRequest(null);
  }

  return <>
    <div ref={hostRef} onPointerDownCapture={() => { cancelCameraMove(); stopRotation(); }} onWheelCapture={stopRotation} className="absolute inset-0 [&_canvas]:touch-pan-y">
      <Globe ref={globeRef} animateIn={false} width={size.width} height={size.height} backgroundColor="rgba(0,0,0,0)" globeMaterial={material}
        showAtmosphere atmosphereColor="#67e8f9" atmosphereAltitude={0.13}
        polygonsData={polygons} polygonGeoJsonGeometry={(polygon) => (polygon as CountryPolygon).geometry as never}
        polygonCapColor={(polygon) => { const code = (polygon as CountryPolygon).countryCode; return code && code === selectedCode ? "#cffafe" : code && mappedCodes.has(code) ? "#3c7777" : "#142d30"; }}
        polygonSideColor={() => "#0b191b"} polygonStrokeColor={() => "#254447"}
        polygonAltitude={(polygon) => (polygon as CountryPolygon).countryCode === selectedCode && selectedCode ? 0.008 : 0.003}
        polygonsTransitionDuration={0}
        onPolygonClick={(polygon) => { const code = (polygon as CountryPolygon).countryCode; const point = points.find((entry) => entry.countryCode === code); if (point) onSelect(point.itemIds[0]); }}
        pointsData={points} pointLat="lat" pointLng="lng" pointAltitude={0.014}
        pointRadius={(point) => (point as Point).selected ? 0.65 : 0.4} pointColor={() => "#a5f3fc"}
        onPointClick={(point) => onSelect((point as Point).itemIds[0])}
        htmlElementsData={annotation} htmlLat="lat" htmlLng="lng" htmlAltitude={0.025} htmlElement={annotationElement} htmlTransitionDuration={0}
        onGlobeReady={handleGlobeReady} />
    </div>
    {ready ? <Button variant="outline" size="sm" type="button" onClick={() => { cancelCameraMove(); setRotationRequest(spinning ? null : { region, selectedId, activityToken }); }} aria-pressed={spinning} className="absolute right-4 top-3 z-10 min-h-11 gap-2 rounded-full bg-[#080d0e]/95 px-3 text-xs motion-reduce:hidden">{spinning ? <Pause className="size-3.5" aria-hidden="true" /> : <RotateCw className="size-3.5" aria-hidden="true" />}{spinning ? "Pause rotation" : "Auto rotate"}</Button> : null}
  </>;
}
