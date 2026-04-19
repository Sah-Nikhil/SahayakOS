export type CityMapConfig = {
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
};

type RawCityMapConfig = {
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  radiusKm?: unknown;
};

const CITY_MAPS_ENV_KEY = "NEXT_PUBLIC_CITY_MAPS";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toCityConfig = (raw: RawCityMapConfig, index: number): CityMapConfig => {
  if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
    throw new Error(`City at index ${index} is missing a valid "name".`);
  }

  if (!isFiniteNumber(raw.latitude) || raw.latitude < -90 || raw.latitude > 90) {
    throw new Error(`City "${raw.name}" has an invalid "latitude".`);
  }

  if (!isFiniteNumber(raw.longitude) || raw.longitude < -180 || raw.longitude > 180) {
    throw new Error(`City "${raw.name}" has an invalid "longitude".`);
  }

  if (!isFiniteNumber(raw.radiusKm) || raw.radiusKm <= 0) {
    throw new Error(`City "${raw.name}" has an invalid "radiusKm".`);
  }

  return {
    name: raw.name.trim(),
    latitude: raw.latitude,
    longitude: raw.longitude,
    radiusKm: raw.radiusKm,
  };
};

export const getCityMapConfigsFromEnv = (): {
  cities: CityMapConfig[];
  error: string | null;
} => {
  const rawValue = process.env[CITY_MAPS_ENV_KEY];

  if (!rawValue) {
    return {
      cities: [],
      error: `Missing ${CITY_MAPS_ENV_KEY}.`,
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return {
        cities: [],
        error: `${CITY_MAPS_ENV_KEY} must be a JSON array.`,
      };
    }

    const cities = parsed.map((item, index) =>
      toCityConfig(item as RawCityMapConfig, index),
    );

    return { cities, error: null };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Invalid JSON.";
    return {
      cities: [],
      error: `Invalid ${CITY_MAPS_ENV_KEY}: ${details}`,
    };
  }
};
