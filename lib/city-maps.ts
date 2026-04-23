export type CityMapConfig = {
  name: string;
  latitude: number;
  longitude: number;
  view?: CityMapViewConfig;
};

type CityMapBoundsPoint = [number, number];

export type CityMapBounds =
  | [CityMapBoundsPoint, CityMapBoundsPoint]
  | [
      CityMapBoundsPoint,
      CityMapBoundsPoint,
      CityMapBoundsPoint,
      CityMapBoundsPoint,
    ];

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

const toBoundsPoint = (
  value: unknown,
  fieldName: string,
  cityName: string,
): CityMapBoundsPoint => {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !isFiniteNumber(value[0]) ||
    !isFiniteNumber(value[1])
  ) {
    throw new Error(
      `City "${cityName}" has invalid "${fieldName}" coordinates. Each entry must be a finite number.`,
    );
  }

  return [value[0], value[1]];
};

const toBounds = (value: unknown, cityName: string): CityMapBounds => {
  if (!Array.isArray(value) || (value.length !== 2 && value.length !== 4)) {
    throw new Error(
      `City "${cityName}" has invalid "bounds". Use [[southWestLat, southWestLng], [northEastLat, northEastLng]] or [[northWestLat, northWestLng], [northEastLat, northEastLng], [southWestLat, southWestLng], [southEastLat, southEastLng]].`,
    );
  }

  if (value.length === 2) {
    const southWest = toBoundsPoint(value[0], "bounds[0]", cityName);
    const northEast = toBoundsPoint(value[1], "bounds[1]", cityName);

    if (southWest[0] > northEast[0] || southWest[1] > northEast[1]) {
      throw new Error(
        `City "${cityName}" has "bounds" in the wrong order. Use [[southWestLat, southWestLng], [northEastLat, northEastLng]].`,
      );
    }

    return [southWest, northEast];
  }

  const northWest = toBoundsPoint(value[0], "bounds[0]", cityName);
  const northEast = toBoundsPoint(value[1], "bounds[1]", cityName);
  const southWest = toBoundsPoint(value[2], "bounds[2]", cityName);
  const southEast = toBoundsPoint(value[3], "bounds[3]", cityName);

  return [northWest, northEast, southWest, southEast];
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
