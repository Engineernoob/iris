export type SatelliteTle = {
  name: string;
  line1: string;
  line2: string;
  noradId: string;
};

const SATELLITES_API_URL = "/api/satellites";
const INITIAL_SATELLITE_LIMIT = 75;

function parseNoradId(line1: string): string {
  return line1.slice(2, 7).trim();
}

export function parseTleCatalog(tleText: string, limit = INITIAL_SATELLITE_LIMIT): SatelliteTle[] {
  const lines = tleText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const satellites: SatelliteTle[] = [];

  let startIndex = 0;
  const firstLine = lines[0] || "";
  if (!firstLine.startsWith("1 ") && !firstLine.startsWith("2 ") && firstLine.includes("GP data")) {
    startIndex = 2;
  }

  for (let index = startIndex; index + 2 < lines.length && satellites.length < limit; index += 3) {
    const name = lines[index];
    const line1 = lines[index + 1];
    const line2 = lines[index + 2];

    if (!line1?.startsWith("1 ") || !line2?.startsWith("2 ")) {
      continue;
    }

    satellites.push({
      name,
      line1,
      line2,
      noradId: parseNoradId(line1),
    });
  }

  return satellites;
}

export async function fetchActiveSatelliteTles(
  limit = INITIAL_SATELLITE_LIMIT,
): Promise<SatelliteTle[]> {
  const response = await fetch(SATELLITES_API_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Satellite feed request failed with status ${response.status}`);
  }

  return ((await response.json()) as SatelliteTle[]).slice(0, limit);
}
