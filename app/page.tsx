import { CityMapDashboard } from "@/components/city-map-dashboard";
import { getCityMapConfigsFromEnv } from "@/lib/city-maps";

export default function Home() {
  const { cities, error } = getCityMapConfigsFromEnv();

  return <CityMapDashboard cities={cities} error={error} />;
}
