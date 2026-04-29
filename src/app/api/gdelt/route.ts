import { NextResponse } from "next/server";

const GDELT_LATEST_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";
const CACHE_TTL_MS = 900_000; // 15 minutes

let cachedData = "";
let cachedAt = 0;

export async function GET() {
  try {
    const now = Date.now();

    if (cachedData && now - cachedAt < CACHE_TTL_MS) {
      return new NextResponse(cachedData, {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=900",
        },
      });
    }

    const latestResponse = await fetch(GDELT_LATEST_URL, { cache: "no-store" });
    if (!latestResponse.ok) {
      throw new Error(`Failed to fetch latest GDELT update: ${latestResponse.status}`);
    }

    const latestText = await latestResponse.text();
    const lines = latestText.split("\n").filter(Boolean);
    const dataLine = lines.find((line) => line.includes("export.CSV.zip"));

    if (!dataLine) {
      throw new Error("No GDELT data URL found");
    }

    const csvUrl = dataLine.split("export.CSV.zip:")[1]?.trim();
    if (!csvUrl) {
      throw new Error("Invalid GDELT data URL");
    }

    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch GDELT CSV: ${csvResponse.status}`);
    }

    const csvText = await csvResponse.text();
    cachedData = csvText;
    cachedAt = now;

    return new NextResponse(csvText, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch (error) {
    console.error("GDELT API error:", error);
    if (cachedData) {
      return new NextResponse(cachedData, {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=60",
        },
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch GDELT data" },
      { status: 500 },
    );
  }
}
