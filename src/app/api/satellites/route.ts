import { NextResponse } from "next/server";

import { parseTleCatalog } from "@/lib/celestrak";

const CELESTRAK_ACTIVE_TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

export const revalidate = 3600;
export const dynamic = "force-dynamic";
const cacheHeaders = {
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=3600",
};

export async function GET() {
  try {
    const response = await fetch(CELESTRAK_ACTIVE_TLE_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json([], {
        headers: cacheHeaders,
      });
    }

    return NextResponse.json(parseTleCatalog(await response.text()), {
      headers: cacheHeaders,
    });
  } catch {
    return NextResponse.json([], {
      headers: cacheHeaders,
    });
  }
}
