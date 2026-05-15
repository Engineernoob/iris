import { NextResponse } from "next/server";

import { fallbackSatelliteTles, parseTleCatalog } from "@/lib/celestrak";

const CELESTRAK_ACTIVE_TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle&ORDER=name";
const SATELLITE_CACHE_TTL_MS = 3_600_000;
const cacheHeaders = {
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=3600",
};

let cachedData: ReturnType<typeof parseTleCatalog> = [];
let cachedAt = 0;
let warnedUpstreamFailure = false;

function fallbackResponse() {
  return NextResponse.json(fallbackSatelliteTles(), {
    headers: {
      ...cacheHeaders,
      "X-Iris-Data-Source": "fallback",
    },
  });
}

function warnUpstreamFailure(message: string) {
  if (warnedUpstreamFailure) {
    return;
  }

  warnedUpstreamFailure = true;
  console.warn(message);
}

export async function GET() {
  try {
    const response = await fetch(CELESTRAK_ACTIVE_TLE_URL, {
      cache: "no-store",
      headers: {
        Accept: "text/plain,*/*",
        "User-Agent": "Iris spatial dashboard local development contact=local",
      },
    });

    const text = await response.text();

    // Check if response contains actual TLE data (starts with line beginning with "1 ")
    const hasTleData = text.includes("\n1 ") || text.startsWith("1 ");

    if (!hasTleData) {
      if (cachedData.length > 0) {
        warnUpstreamFailure(`CelesTrak returned non-TLE response (${response.status}); using cached satellite data.`);
        return NextResponse.json(cachedData, { headers: cacheHeaders });
      }
      warnUpstreamFailure(`CelesTrak returned non-TLE response (${response.status}); using fallback satellite data.`);
      return fallbackResponse();
    }

    cachedData = parseTleCatalog(text);
    cachedAt = Date.now();
    warnedUpstreamFailure = false;

    return NextResponse.json(cachedData, {
      headers: cacheHeaders,
    });
  } catch (error) {
    if (cachedData.length > 0 && Date.now() - cachedAt < SATELLITE_CACHE_TTL_MS) {
      warnUpstreamFailure(`Satellite API error; using cached satellite data. ${String(error)}`);
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }
    warnUpstreamFailure(`Satellite API error; using fallback satellite data. ${String(error)}`);
    return fallbackResponse();
  }
}
