import { NextResponse } from "next/server";

import { normalizeOpenSkyStates } from "@/lib/opensky";

const OPEN_SKY_STATES_URL = "https://opensky-network.org/api/states/all";

export const revalidate = 20;
export const dynamic = "force-dynamic";
const cacheHeaders = {
  "Cache-Control": "s-maxage=20, stale-while-revalidate=20",
};

export async function GET() {
  try {
    const response = await fetch(OPEN_SKY_STATES_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json([], {
        headers: cacheHeaders,
      });
    }

    const data = await response.json();

    return NextResponse.json(normalizeOpenSkyStates(data), {
      headers: cacheHeaders,
    });
  } catch {
    return NextResponse.json([], {
      headers: cacheHeaders,
    });
  }
}
