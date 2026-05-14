import { NextResponse } from "next/server";
import { unzip } from "unzipit";
import type { ZipEntry } from "unzipit";

const GDELT_LATEST_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";
const CACHE_TTL_MS = 900_000; // 15 minutes
const CSV_CONTENT_TYPE = "text/plain";

let cachedData = "";
let cachedAt = 0;

function csvResponse(csvText: string, maxAgeSeconds: number): NextResponse {
  return new NextResponse(csvText, {
    headers: {
      "Content-Type": CSV_CONTENT_TYPE,
      "Cache-Control": `public, max-age=${maxAgeSeconds}`,
    },
  });
}

function parseLatestCsvUrl(latestText: string): string {
  const dataLine = latestText
    .split("\n")
    .find((line) => line.includes("export.CSV.zip"));
  const csvUrl = dataLine?.split(" ").pop()?.trim();

  if (!csvUrl || !csvUrl.startsWith("http")) {
    throw new Error("No valid GDELT data URL found");
  }

  return csvUrl;
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.arrayBuffer();
}

function findCsvEntry(entries: Record<string, ZipEntry>): ZipEntry {
  const csvEntry = Object.values(entries).find((entry) => entry.name.endsWith(".CSV"));

  if (!csvEntry) {
    throw new Error("No CSV file found in GDELT ZIP");
  }

  return csvEntry;
}

async function fetchLatestGdeltCsv(): Promise<string> {
  const latestText = await fetchText(GDELT_LATEST_URL, { cache: "no-store" });
  const csvUrl = parseLatestCsvUrl(latestText);
  const zipBuffer = await fetchArrayBuffer(csvUrl);
  const { entries } = await unzip(zipBuffer);
  const csvEntry = findCsvEntry(entries);

  return csvEntry.text();
}

export async function GET() {
  try {
    const now = Date.now();

    if (cachedData && now - cachedAt < CACHE_TTL_MS) {
      return csvResponse(cachedData, 900);
    }

    const csvText = await fetchLatestGdeltCsv();
    cachedData = csvText;
    cachedAt = now;

    return csvResponse(csvText, 900);
  } catch (error) {
    console.error("GDELT API error:", error);
    if (cachedData) {
      return csvResponse(cachedData, 60);
    }
    return NextResponse.json(
      { error: "Failed to fetch GDELT data" },
      { status: 500 },
    );
  }
}
