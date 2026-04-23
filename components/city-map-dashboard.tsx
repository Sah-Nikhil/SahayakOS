"use client";

import { useMemo, useState } from "react";
import { CityMap } from "@/components/city-map";
import type { CityMapConfig } from "@/lib/city-maps";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { NGOSidebar } from "@/components/ngo-sidebar";

type CityMapDashboardProps = {
  cities: CityMapConfig[];
  error: string | null;
};

export function CityMapDashboard({ cities, error }: CityMapDashboardProps) {
  const [selectedCityName, setSelectedCityName] = useState(cities[0]?.name ?? "");

  const selectedCity = useMemo(
    () => cities.find((city) => city.name === selectedCityName) ?? cities[0],
    [cities, selectedCityName],
  );

  return (
    <main className="flex h-screen w-full bg-background">
      <section className="relative h-full flex-1 overflow-hidden">
        {selectedCity ? (
          <>
            <div className="absolute left-6 top-6 z-600">
              <ButtonGroup className="rounded-full shadow-sm bg-background/90 backdrop-blur-sm border-border p-1">
                {cities.map((city) => (
                  <Button
                    key={city.name}
                    variant={city.name === selectedCityName ? "default" : "ghost"}
                    onClick={() => setSelectedCityName(city.name)}
                    className={`rounded-full px-5 text-sm font-medium transition-all ${
                      city.name === selectedCityName
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {city.name}
                  </Button>
                ))}
              </ButtonGroup>
            </div>

            <CityMap
              cityName={selectedCity.name}
              center={{
                latitude: selectedCity.latitude,
                longitude: selectedCity.longitude,
              }}
              view={selectedCity.view}
              heightClassName="h-full"
              className="h-full w-full rounded-none border-0"
            />
          </>
        ) : (
          <section className="m-4 rounded-xl border border-border p-4 text-sm text-muted-foreground">
            {error ? error : "No city map entries found."}
          </section>
        )}
      </section>
      <NGOSidebar className="hidden xl:flex" />
    </main>
  );
}
