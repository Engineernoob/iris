import type { Polygon } from "geojson";

export type ImageryFootprint = {
  id: string;
  title: string;
  collection: string;
  datetime: string;
  cloudCover: number | null;
  geometry: Polygon;
};

type StacFeature = {
  id?: unknown;
  collection?: unknown;
  properties?: {
    datetime?: unknown;
    "eo:cloud_cover"?: unknown;
  };
  geometry?: unknown;
};

type StacResponse = {
  features?: StacFeature[];
};

const IMAGERY_API_URL = "/api/imagery";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isPolygon(value: unknown): value is Polygon {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === "Polygon" &&
      "coordinates" in value &&
      Array.isArray(value.coordinates),
  );
}

export function normalizeStacImagery(data: StacResponse, limit = 24): ImageryFootprint[] {
  if (!Array.isArray(data.features)) {
    return [];
  }

  return data.features.flatMap((feature) => {
    if (!isPolygon(feature.geometry)) {
      return [];
    }

    const collection = stringValue(feature.collection) || "HLSS30_2.0";
    const id = stringValue(feature.id);

    return [{
      id: id || `${collection}:${feature.properties?.datetime ?? "unknown"}`,
      title: id || "Imagery footprint",
      collection,
      datetime: stringValue(feature.properties?.datetime) || "--",
      cloudCover: finiteNumber(feature.properties?.["eo:cloud_cover"]),
      geometry: feature.geometry,
    }];
  }).slice(0, limit);
}

export function formatImageryFootprint(footprint: ImageryFootprint): Record<string, string | number> {
  return {
    Collection: footprint.collection,
    Acquired: footprint.datetime,
    "Cloud Cover": footprint.cloudCover === null ? "--" : `${footprint.cloudCover.toFixed(1)}%`,
    Source: "NASA CMR/STAC",
  };
}

export async function fetchImageryFootprints(limit = 24): Promise<ImageryFootprint[]> {
  const response = await fetch(IMAGERY_API_URL, { cache: "no-store" });

  if (!response.ok) {
    return [];
  }

  return ((await response.json()) as ImageryFootprint[]).slice(0, limit);
}
