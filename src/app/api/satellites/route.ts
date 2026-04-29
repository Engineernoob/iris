import { NextResponse } from "next/server";

import { parseTleCatalog } from "@/lib/celestrak";

const CELESTRAK_ACTIVE_TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle&ORDER=name";
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

    const text = await response.text();

    // Check if response contains actual TLE data (starts with line beginning with "1 ")
    const hasTleData = text.includes("\n1 ") || text.startsWith("1 ");

    if (!hasTleData) {
      if (cachedData.length > 0) {
        console.log("Celestrak returned non-TLE response, using cached data");
        return NextResponse.json(cachedData, { headers: cacheHeaders });
      }
      console.error("Celestrak API not returning TLE data:", text.slice(0, 200));
      return NextResponse.json([], { headers: cacheHeaders });
    }

    cachedData = parseTleCatalog(text);
    cachedAt = Date.now();

    return NextResponse.json(cachedData, {
      headers: cacheHeaders,
    });
  } catch (error) {
    console.error("Satellite API error:", error);
    if (cachedData.length > 0 && Date.now() - cachedAt < SATELLITE_CACHE_TTL_MS) {
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }
    return NextResponse.json([], { headers: cacheHeaders });
  }
}
