import { NextResponse } from "next/server";

import { parseTleCatalog } from "@/lib/celestrak";

const CELESTRAK_ACTIVE_TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";
const SATELLITE_CACHE_TTL_MS = 3_600_000;
const cacheHeaders = {
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=3600",
};

let cachedData: ReturnType<typeof parseTleCatalog> = [];
let cachedAt = 0;

export async function GET() {
  try {
    const response = await fetch(CELESTRAK_ACTIVE_TLE_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      if (cachedData.length > 0) {
        return NextResponse.json(cachedData, { headers: cacheHeaders });
      }
      return NextResponse.json([], { headers: cacheHeaders });
    }

    const text = await response.text();
    cachedData = parseTleCatalog(text);
    cachedAt = Date.now();

    return NextResponse.json(cachedData, {
      headers: cacheHeaders,
    });
  } catch {
    if (cachedData.length > 0 && Date.now() - cachedAt < SATELLITE_CACHE_TTL_MS) {
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }
    return NextResponse.json([], { headers: cacheHeaders });
  }
}
