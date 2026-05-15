export type HumanitarianReport = {
  id: string;
  title: string;
  country: string;
  status: string;
  disasterType: string;
  date: string;
  longitude: number;
  latitude: number;
  url: string;
};

type ReliefWebCountry = {
  name?: unknown;
  location?: {
    lat?: unknown;
    lon?: unknown;
  };
};

type ReliefWebItem = {
  id?: unknown;
  href?: unknown;
  fields?: {
    name?: unknown;
    status?: unknown;
    type?: Array<{ name?: unknown }> | { name?: unknown };
    date?: { created?: unknown; changed?: unknown; event?: unknown };
    primary_country?: ReliefWebCountry;
    country?: ReliefWebCountry[];
  };
};

type ReliefWebResponse = {
  data?: ReliefWebItem[];
};

const HUMANITARIAN_API_URL = "/api/humanitarian";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function typeLabel(value: ReliefWebItem["fields"] extends infer Fields ? Fields extends { type?: infer Type } ? Type | undefined : never : never): string {
  if (Array.isArray(value)) {
    return value.map((item) => stringValue(item.name)).filter(Boolean).join(", ");
  }

  if (value && typeof value === "object" && "name" in value) {
    return stringValue(value.name);
  }

  return "--";
}

export function normalizeReliefWebDisasters(data: ReliefWebResponse, limit = 40): HumanitarianReport[] {
  if (!Array.isArray(data.data)) {
    return [];
  }

  return data.data.flatMap((item) => {
    const primaryCountry = item.fields?.primary_country ?? item.fields?.country?.[0];
    const latitude = finiteNumber(primaryCountry?.location?.lat);
    const longitude = finiteNumber(primaryCountry?.location?.lon);

    if (latitude === null || longitude === null) {
      return [];
    }

    return [{
      id: stringValue(item.id) || `${longitude}:${latitude}:${item.fields?.name ?? "reliefweb"}`,
      title: stringValue(item.fields?.name) || "Humanitarian situation",
      country: stringValue(primaryCountry?.name) || "Unknown",
      status: stringValue(item.fields?.status) || "--",
      disasterType: typeLabel(item.fields?.type),
      date: stringValue(item.fields?.date?.event) || stringValue(item.fields?.date?.created) || "--",
      longitude,
      latitude,
      url: stringValue(item.href),
    }];
  }).slice(0, limit);
}

export function formatHumanitarianReport(report: HumanitarianReport): Record<string, string | number> {
  return {
    Country: report.country,
    Status: report.status,
    Type: report.disasterType,
    Date: report.date,
    Latitude: report.latitude.toFixed(4),
    Longitude: report.longitude.toFixed(4),
    Source: "ReliefWeb",
  };
}

export async function fetchHumanitarianReports(limit = 40): Promise<HumanitarianReport[]> {
  const response = await fetch(HUMANITARIAN_API_URL, { cache: "no-store" });

  if (!response.ok) {
    return [];
  }

  return ((await response.json()) as HumanitarianReport[]).slice(0, limit);
}
