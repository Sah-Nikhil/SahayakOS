export type CityMapConfig = {
  name: string;
  latitude: number;
  longitude: number;
  view?: CityMapViewConfig;
};

export type CityMapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type CityMapViewConfig = {
  initialZoom?: number;
  minZoom?: number;
  bounds?: CityMapBounds;
};

type RawCityMapConfig = {
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  view?: unknown;
};

type RawCityMapViewConfig = {
  initialZoom?: unknown;
  minZoom?: unknown;
  bounds?: unknown;
};

type RawCityMapBounds = {
  north?: unknown;
  south?: unknown;
  east?: unknown;
  west?: unknown;
};

const CITY_MAPS_ENV_KEY = "NEXT_PUBLIC_CITY_MAPS";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toOptionalZoom = (
  value: unknown,
  fieldName: "initialZoom" | "minZoom",
  cityName: string,
) => {
  if (value === undefined) {
    return undefined;
  }

  if (!isFiniteNumber(value) || value < 0 || value > 22) {
    throw new Error(`City "${cityName}" has an invalid "${fieldName}".`);
  }

  return value;
};

const toBounds = (value: unknown, cityName: string): CityMapBounds => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `City "${cityName}" has invalid "bounds". Use { north, south, east, west }.`,
    );
  }

  const raw = value as RawCityMapBounds;
  const north = raw.north;
  const south = raw.south;
  const east = raw.east;
  const west = raw.west;

  if (
    !isFiniteNumber(north) ||
    !isFiniteNumber(south) ||
    !isFiniteNumber(east) ||
    !isFiniteNumber(west)
  ) {
    throw new Error(
      `City "${cityName}" has invalid "bounds" coordinates. Each edge must be a finite number.`,
    );
  }

  if (north <= south || east <= west) {
    throw new Error(
      `City "${cityName}" has invalid "bounds" ordering. Require north > south and east > west.`,
    );
  }

  return { north, south, east, west };
};

const toViewConfig = (
  rawView: unknown,
  cityName: string,
): CityMapViewConfig | undefined => {
  if (rawView === undefined) {
    return undefined;
  }

  if (rawView === null || typeof rawView !== "object" || Array.isArray(rawView)) {
    throw new Error(`City "${cityName}" has an invalid "view" object.`);
  }

  const raw = rawView as RawCityMapViewConfig;
  const initialZoom = toOptionalZoom(raw.initialZoom, "initialZoom", cityName);
  const minZoom = toOptionalZoom(raw.minZoom, "minZoom", cityName);
  const bounds = raw.bounds === undefined ? undefined : toBounds(raw.bounds, cityName);

  if (initialZoom === undefined && minZoom === undefined && bounds === undefined) {
    return undefined;
  }

  return {
    initialZoom,
    minZoom,
    bounds,
  };
};

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

  return {
    name: raw.name.trim(),
    latitude: raw.latitude,
    longitude: raw.longitude,
    view: toViewConfig(raw.view, raw.name.trim()),
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
