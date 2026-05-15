export type EarthquakeEvent = {
  id: string;
  title: string;
  magnitude: number | null;
  place: string;
  time: string;
  longitude: number;
  latitude: number;
  depthKm: number | null;
  url: string;
};

type UsgsEarthquakeFeature = {
  id?: unknown;
  properties?: {
    title?: unknown;
    mag?: unknown;
    place?: unknown;
    time?: unknown;
    url?: unknown;
  };
  geometry?: {
    coordinates?: unknown;
  };
};

type UsgsEarthquakeResponse = {
  features?: UsgsEarthquakeFeature[];
};

const EARTHQUAKES_API_URL = "/api/earthquakes";

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeUsgsEarthquakes(data: UsgsEarthquakeResponse, limit = 80): EarthquakeEvent[] {
  if (!Array.isArray(data.features)) {
    return [];
  }

  return data.features.flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    if (!Array.isArray(coordinates)) {
      return [];
    }

    const longitude = finiteNumber(coordinates[0]);
    const latitude = finiteNumber(coordinates[1]);
    if (longitude === null || latitude === null) {
      return [];
    }

    const timeMs = finiteNumber(feature.properties?.time);

    return [{
      id: stringValue(feature.id) || `${longitude}:${latitude}:${timeMs ?? "unknown"}`,
      title: stringValue(feature.properties?.title) || "Earthquake",
      magnitude: finiteNumber(feature.properties?.mag),
      place: stringValue(feature.properties?.place) || "Unknown location",
      time: timeMs ? new Date(timeMs).toISOString() : "--",
      longitude,
      latitude,
      depthKm: finiteNumber(coordinates[2]),
      url: stringValue(feature.properties?.url),
    }];
  }).slice(0, limit);
}

export function formatEarthquakeEvent(event: EarthquakeEvent): Record<string, string | number> {
  return {
    Magnitude: event.magnitude === null ? "--" : event.magnitude.toFixed(1),
    Place: event.place,
    Time: event.time,
    Depth: event.depthKm === null ? "--" : `${event.depthKm.toFixed(1)} km`,
    Latitude: event.latitude.toFixed(4),
    Longitude: event.longitude.toFixed(4),
    Source: "USGS",
  };
}

export async function fetchEarthquakeEvents(limit = 80): Promise<EarthquakeEvent[]> {
  const response = await fetch(EARTHQUAKES_API_URL, { cache: "no-store" });

  if (!response.ok) {
    return [];
  }

  return ((await response.json()) as EarthquakeEvent[]).slice(0, limit);
}
