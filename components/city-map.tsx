"use client";

import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { Minus, Plus } from "lucide-react";
import type { Circle, LatLngExpression, Map as LeafletMap } from "leaflet";

const RADIUS_PADDING_FACTOR = 1.05;
const EPSILON_PADDING = 0.001;

export type CityMapProps = {
  cityName: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radiusKm: number;
  heightClassName?: string;
  showCityBoundary?: boolean;
  className?: string;
};

const kmToMeters = (km: number) => km * 1000;
const getCityBounds = (
  leaflet: typeof import("leaflet"),
  center: LatLngExpression,
  radiusKm: number,
) =>
  leaflet
    .latLng(center)
    .toBounds(kmToMeters(radiusKm * RADIUS_PADDING_FACTOR))
    .pad(EPSILON_PADDING);

export function CityMap({
  cityName,
  center,
  radiusKm,
  heightClassName,
  showCityBoundary = false,
  className,
}: CityMapProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const boundsCircleRef = useRef<Circle | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const minZoomRef = useRef<number>(0);

  const mapCenter = useMemo<LatLngExpression>(
    () => [center.latitude, center.longitude],
    [center.latitude, center.longitude],
  );

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;
    let map: LeafletMap | null = null;

    void (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !mapNodeRef.current) {
        return;
      }

      leafletRef.current = leaflet;
      map = leaflet.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: true,
        maxBoundsViscosity: 1,
      });
      mapRef.current = map;

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);

      const baseBounds = getCityBounds(leaflet, mapCenter, radiusKm);
      map.fitBounds(baseBounds, { animate: false, padding: [20, 20] });

      if (showCityBoundary) {
        const displayCircle = leaflet
          .circle(mapCenter, {
            radius: kmToMeters(radiusKm),
            color: "hsl(215 25% 60%)",
            weight: 1.5,
            fillColor: "hsl(215 28% 78%)",
            fillOpacity: 0.12,
            interactive: false,
          })
          .addTo(map);
        boundsCircleRef.current = displayCircle;
      }

      const minZoom = map.getBoundsZoom(baseBounds, true);
      minZoomRef.current = minZoom;
      map.setMinZoom(minZoom);
      map.setMaxBounds(baseBounds.pad(0.08));

      map.on("zoomend", () => {
        if (map && map.getZoom() < minZoomRef.current) {
          map.setZoom(minZoomRef.current, { animate: false });
        }
      });
    })();

    return () => {
      cancelled = true;
      map?.off();
      map?.remove();
      mapRef.current = null;
      boundsCircleRef.current = null;
      leafletRef.current = null;
    };
  }, [mapCenter, radiusKm, showCityBoundary]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    if (!leaflet || !map) {
      return;
    }

    const circle = boundsCircleRef.current;
    if (circle) {
      circle.setLatLng(mapCenter);
      circle.setRadius(kmToMeters(radiusKm));
    }

    const baseBounds = getCityBounds(leaflet, mapCenter, radiusKm);
    const minZoom = map.getBoundsZoom(baseBounds, true);
    minZoomRef.current = minZoom;
    map.setMinZoom(minZoom);
    map.setMaxBounds(baseBounds.pad(0.08));
    map.fitBounds(baseBounds, { animate: false, padding: [20, 20] });
  }, [mapCenter, radiusKm]);

  return (
    <section
      aria-label={`${cityName} map`}
      className={`relative overflow-hidden rounded-xl border bg-card shadow-sm ${className ?? ""}`}
    >
      <div ref={mapNodeRef} className={`w-full ${heightClassName ?? "h-96"}`} />
      <div className="absolute bottom-4 left-4 z-[500] flex flex-col overflow-hidden rounded-lg border border-border bg-background/95 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          aria-label={`Zoom in on ${cityName}`}
          onClick={() => mapRef.current?.zoomIn(1)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Zoom out on ${cityName}`}
          onClick={() => mapRef.current?.zoomOut(1)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center border-t border-border text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
