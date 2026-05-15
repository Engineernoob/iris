import { NextResponse } from "next/server";

import { normalizeReliefWebDisasters } from "@/lib/humanitarian";

const RELIEFWEB_APP_NAME = process.env.RELIEFWEB_APP_NAME ?? "";
const RELIEFWEB_DISASTERS_URL = "https://api.reliefweb.int/v2/disasters";
const CACHE_TTL_MS = 900_000;
const cacheHeaders = {
  "Cache-Control": "s-maxage=900, stale-while-revalidate=900",
};

let cachedData: ReturnType<typeof normalizeReliefWebDisasters> = [];
let cachedAt = 0;

export async function GET() {
  if (!RELIEFWEB_APP_NAME) {
    return NextResponse.json(cachedData, { headers: cacheHeaders });
  }

  try {
    const response = await fetch(`${RELIEFWEB_DISASTERS_URL}?appname=${encodeURIComponent(RELIEFWEB_APP_NAME)}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: 40,
        preset: "latest",
        profile: "full",
        fields: {
          include: ["name", "status", "type", "date", "primary_country", "country"],
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }

    cachedData = normalizeReliefWebDisasters(await response.json());
    cachedAt = Date.now();

    return NextResponse.json(cachedData, { headers: cacheHeaders });
  } catch {
    if (cachedData.length > 0 && Date.now() - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(cachedData, { headers: cacheHeaders });
    }

    return NextResponse.json([], { headers: cacheHeaders });
  }
}
