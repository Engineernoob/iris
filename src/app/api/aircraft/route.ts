import { NextResponse } from "next/server";

import { normalizeOpenSkyStates } from "@/lib/opensky";

const OPEN_SKY_STATES_URL = "https://opensky-network.org/api/states/all";
const AIRCRAFT_CACHE_TTL_MS = 20_000;
const cacheHeaders = {
  "Cache-Control": "s-maxage=20, stale-while-revalidate=20",
};

let cachedData: ReturnType<typeof normalizeOpenSkyStates> = [];
let cachedAt = 0;

export async function GET() {
  try {
    const response = await fetch(OPEN_SKY_STATES_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      if (cachedData.length > 0) {
        return NextResponse.json(cachedData, { headers: cacheHeaders });
      }
      return NextResponse.json([], { headers: cacheHeaders });
    }

    const data = await response.json();
    cachedData = normalizeOpenSkyStates(data);
    cachedAt = Date.now();

    return NextResponse.json(cachedData, {
      headers: cacheHeaders,
    });
  } catch {
    if (cachedData.length > 0 && Date.now() - cachedAt < AIRCRAFT_CACHE_TTL_MS) {
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }
    return NextResponse.json([], { headers: cacheHeaders });
  }
}
