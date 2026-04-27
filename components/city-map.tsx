"use client";

import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { Minus, Plus } from "lucide-react";
import type { LatLngExpression, Map as LeafletMap, LayerGroup } from "leaflet";
import type { CityMapBounds, CityMapViewConfig } from "@/lib/city-maps";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const CLEAN_LIGHT_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
const CLEAN_LIGHT_LABELS_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png";
const CLEAN_LIGHT_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Leaflet zoom levels are logarithmic, so a 1.09x scale change is roughly 9%.
const ZOOM_SCALE_STEP = 1.09;
const ZOOM_STEP = Math.log2(ZOOM_SCALE_STEP);

// Tweak these values if you want to experiment with how far the map opens.
const DEFAULT_ZOOM_BREAKPOINTS = {
  compact: 10,
  standard: 10.5,
  wide: 11,
} as const;

const DEFAULT_MIN_ZOOM_FLOOR = 5;
const DEFAULT_MIN_ZOOM_OFFSET = 4;
const DEFAULT_MAX_ZOOM = 19;

export type CityMapMarker = {
  ngoId: Id<"ngos">;
  ngoName: string;
  lat: number;
  lng: number;
  opportunitiesCount: number;
};

export type CityMapProps = {
  cityName: string;
  center: {
    latitude: number;
    longitude: number;
  };
  view?: CityMapViewConfig;
  heightClassName?: string;
  className?: string;
  onMarkerClick?: (ngoId: Id<"ngos">) => void;
};

const getInitialZoom = (map: LeafletMap, overrideZoom?: number) => {
  if (overrideZoom !== undefined) {
    return overrideZoom;
  }

  const { x, y } = map.getSize();
  const shortestSide = Math.min(x, y);

  if (shortestSide < 720) {
    return DEFAULT_ZOOM_BREAKPOINTS.compact;
  }

  if (shortestSide < 980) {
    return DEFAULT_ZOOM_BREAKPOINTS.standard;
  }

  return DEFAULT_ZOOM_BREAKPOINTS.wide;
};

const toLeafletBounds = (
  bounds: CityMapBounds,
): [[number, number], [number, number]] => [
  [bounds.south, bounds.west],
  [bounds.north, bounds.east],
];

const getMinimumZoom = (map: LeafletMap, view?: CityMapViewConfig) => {
  if (view?.minZoom !== undefined) {
    return view.minZoom;
  }

  if (view?.bounds) {
    return map.getBoundsZoom(toLeafletBounds(view.bounds), true);
  }

  const initialZoom = getInitialZoom(map, view?.initialZoom);
  return Math.max(DEFAULT_MIN_ZOOM_FLOOR, Math.floor(initialZoom - DEFAULT_MIN_ZOOM_OFFSET));
};

export function CityMap({
  cityName,
  center,
  view,
  heightClassName,
  className,
  onMarkerClick,
}: CityMapProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);

  const mapData = useQuery(api.queries.getMapData, { city: cityName });

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

      map = leaflet.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: true,
        maxZoom: DEFAULT_MAX_ZOOM,
        zoomDelta: ZOOM_STEP,
        zoomSnap: ZOOM_STEP,
        maxBoundsViscosity: view?.bounds ? 1 : 0,
      });
      mapRef.current = map;
      markersLayerRef.current = leaflet.layerGroup().addTo(map);
      const minimumZoom = getMinimumZoom(map, view);
      map.setMinZoom(minimumZoom);

      if (view?.bounds) {
        map.setMaxBounds(toLeafletBounds(view.bounds));
      }

      leaflet
        .tileLayer(CLEAN_LIGHT_TILE_URL, {
          maxZoom: DEFAULT_MAX_ZOOM,
          attribution: CLEAN_LIGHT_TILE_ATTRIBUTION,
          subdomains: "abcd",
        })
        .addTo(map);

      leaflet
        .tileLayer(CLEAN_LIGHT_LABELS_TILE_URL, {
          maxZoom: DEFAULT_MAX_ZOOM,
          attribution: CLEAN_LIGHT_TILE_ATTRIBUTION,
          subdomains: "abcd",
          opacity: 0.9,
        })
        .addTo(map);

      const initialZoom = Math.max(
        getInitialZoom(map, view?.initialZoom),
        minimumZoom,
      );

      map.setView(mapCenter, initialZoom, {
        animate: false,
      });
    })();

    return () => {
      cancelled = true;
      map?.off();
      map?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [cityName, mapCenter, view]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer || !mapData) {
      return;
    }

    layer.clearLayers();

    void (async () => {
      const leaflet = await import("leaflet");
      for (const marker of mapData) {
        const circle = leaflet.circleMarker([marker.lat, marker.lng], {
          radius: 8,
          color: "#0f766e",
          fillColor: "#14b8a6",
          fillOpacity: 0.85,
          weight: 2,
        });

        circle
          .bindTooltip(`${marker.ngoName} (${marker.opportunitiesCount})`, {
            direction: "top",
            className: "rounded-lg border-0 bg-background/95 px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm",
          })
          .on("click", () => {
            if (onMarkerClick) {
              onMarkerClick(marker.ngoId);
            }
          })
          .addTo(layer);
      }
    })();
  }, [mapData, onMarkerClick]);

  return (
    <section
      aria-label={`${cityName} map`}
      className={`relative overflow-hidden rounded-xl border bg-card shadow-sm ${className ?? ""}`}
    >
      <div ref={mapNodeRef} className={`w-full ${heightClassName ?? "h-96"}`} />
      <div className="absolute bottom-4 left-4 z-500 flex flex-col overflow-hidden rounded-lg border border-border bg-background/95 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          aria-label={`Zoom in on ${cityName}`}
          onClick={() => mapRef.current?.zoomIn()}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Zoom out on ${cityName}`}
          onClick={() => mapRef.current?.zoomOut()}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center border-t border-border text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
