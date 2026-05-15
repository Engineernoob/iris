import { NextResponse } from "next/server";

import { normalizeUsgsEarthquakes } from "@/lib/earthquakes";

const USGS_EARTHQUAKES_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
const CACHE_TTL_MS = 300_000;
const cacheHeaders = {
  "Cache-Control": "s-maxage=300, stale-while-revalidate=300",
};

let cachedData: ReturnType<typeof normalizeUsgsEarthquakes> = [];
let cachedAt = 0;

export async function GET() {
  try {
    const response = await fetch(USGS_EARTHQUAKES_URL, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }

    cachedData = normalizeUsgsEarthquakes(await response.json());
    cachedAt = Date.now();

    return NextResponse.json(cachedData, { headers: cacheHeaders });
  } catch {
    if (cachedData.length > 0 && Date.now() - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }

    return NextResponse.json([], { headers: cacheHeaders });
  }
}
