import { NextResponse } from "next/server";

import { normalizeStacImagery } from "@/lib/imagery";

const NASA_CMR_STAC_SEARCH_URL = "https://cmr.earthdata.nasa.gov/stac/LPCLOUD/search";
const CACHE_TTL_MS = 3_600_000;
const cacheHeaders = {
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=3600",
};

let cachedData: ReturnType<typeof normalizeStacImagery> = [];
let cachedAt = 0;

function stacDatetimeWindow(): string {
  const end = new Date();
  const start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);

  return `${start.toISOString()}/${end.toISOString()}`;
}

export async function GET() {
  try {
    const response = await fetch(NASA_CMR_STAC_SEARCH_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collections: ["HLSS30_2.0"],
        datetime: stacDatetimeWindow(),
        limit: 24,
        sortby: [{ field: "properties.datetime", direction: "desc" }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }

    cachedData = normalizeStacImagery(await response.json());
    cachedAt = Date.now();

    return NextResponse.json(cachedData, { headers: cacheHeaders });
  } catch {
    if (cachedData.length > 0 && Date.now() - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }

    return NextResponse.json([], { headers: cacheHeaders });
  }
}
