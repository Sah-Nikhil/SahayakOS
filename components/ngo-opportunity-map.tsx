"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UrgencyFilter = "all" | "low" | "medium" | "high";

export function NgoOpportunityMap() {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [selectedNgoId, setSelectedNgoId] = useState<Id<"ngos"> | null>(null);

  const filters = useMemo(
    () => ({
      ...(cityFilter.trim() ? { city: cityFilter.trim() } : {}),
      ...(skillFilter.trim() ? { skill: skillFilter.trim() } : {}),
      ...(urgencyFilter !== "all" ? { urgency: urgencyFilter } : {}),
    }),
    [cityFilter, skillFilter, urgencyFilter],
  );

  const mapData = useQuery(api.queries.getMapData, filters);
  const ngosWithOpportunities = useQuery(api.queries.getNGOsWithOpportunities, filters);
  const updateOpportunityStatus = useMutation(api.mutations.updateOpportunityStatus);

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

      map = leaflet.map(mapNodeRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
      mapRef.current = map;
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
        .addTo(map);

      markersLayerRef.current = leaflet.layerGroup().addTo(map);
    })();

    return () => {
      cancelled = true;
      map?.off();
      map?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    if (!mapData || mapData.length === 0) {
      return;
    }

    void (async () => {
      const leaflet = await import("leaflet");
      const bounds = leaflet.latLngBounds([]);

      for (const marker of mapData) {
        const circle = leaflet.circleMarker([marker.lat, marker.lng], {
          radius: 8,
          color: "#0f766e",
          fillColor: "#14b8a6",
          fillOpacity: 0.85,
          weight: 2,
        });

        circle
          .bindTooltip(`${marker.ngoName} (${marker.opportunitiesCount})`, { direction: "top" })
          .on("click", () => setSelectedNgoId(marker.ngoId))
          .addTo(layer);

        bounds.extend([marker.lat, marker.lng]);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.3));
      }
    })();
  }, [mapData]);

  const activeNgoId = useMemo(() => {
    if (!mapData || mapData.length === 0) {
      return null;
    }

    if (selectedNgoId && mapData.some((marker) => marker.ngoId === selectedNgoId)) {
      return selectedNgoId;
    }

    return mapData[0].ngoId;
  }, [mapData, selectedNgoId]);

  const selectedNgo = useMemo(() => {
    if (!ngosWithOpportunities || !activeNgoId) {
      return null;
    }

    return ngosWithOpportunities.find((ngo) => ngo._id === activeNgoId) ?? null;
  }, [activeNgoId, ngosWithOpportunities]);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            placeholder="Filter by city"
          />
          <Input
            value={skillFilter}
            onChange={(event) => setSkillFilter(event.target.value)}
            placeholder="Filter by skill"
          />
          <select
            value={urgencyFilter}
            onChange={(event) => setUrgencyFilter(event.target.value as UrgencyFilter)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">All urgencies</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div ref={mapNodeRef} className="h-[560px] rounded-xl border" />
      </div>

      <aside className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">NGO opportunities</h2>
        {!selectedNgo ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Select an NGO marker to inspect opportunities.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">{selectedNgo.name}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedNgo.hqLocation.city}, {selectedNgo.hqLocation.country}
              </p>
            </div>

            {selectedNgo.opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No opportunities match current filters.</p>
            ) : (
              selectedNgo.opportunities.map((opportunity) => (
                <article key={opportunity._id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium">{opportunity.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {opportunity.location.city} • {opportunity.urgency} • {opportunity.status}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateOpportunityStatus({
                          opportunityId: opportunity._id,
                          status: opportunity.status === "open" ? "filled" : "open",
                        })
                      }
                    >
                      {opportunity.status === "open" ? "Mark filled" : "Reopen"}
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </aside>
    </section>
  );
}
