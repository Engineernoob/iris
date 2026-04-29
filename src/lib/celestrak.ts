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

const FALLBACK_TLES: SatelliteTle[] = [
  {
    name: "ISS (ZARYA)",
    line1: "1 25544U 98067A   24128.57291667  .00016717  00000-0  30753-3 0  9993",
    line2: "2 25544  51.6416  16.2706 0005157  41.4553  25.6016 15.50377561498371",
    noradId: "25544",
  },
  {
    name: "NOAA 19",
    line1: "1 33591U 09005A   24128.56736111  .00000205  00000-0  15554-3 0  9999",
    line2: "2 33591  99.1412 179.0660 0012447 126.8376 233.3668 14.12520110827633",
    noradId: "33591",
  },
  {
    name: "Hubble Space Telescope",
    line1: "1 20580U 90037B   24128.52083333  .00001593  00000-0  57385-4 0  9991",
    line2: "2 20580  28.4696 165.1382 0002584 215.8778 144.2077 15.09279737663094",
    noradId: "20580",
  },
  {
    name: "TERRA",
    line1: "1 25994U 99068A   24128.54166667  .00000298  00000-0  10830-3 0  9996",
    line2: "2 25994  98.1073 170.3214 0001274 100.9920 259.1440 14.57196755768838",
    noradId: "25994",
  },
  {
    name: "AQUA",
    line1: "1 27424U 02022A   24128.55000000  .00000215  00000-0  11932-3 0  9997",
    line2: "2 27424  98.2472 168.8257 0001987  91.0705 269.0684 14.19555819791732",
    noradId: "27424",
  },
];

export async function fetchActiveSatelliteTles(
  limit = INITIAL_SATELLITE_LIMIT,
): Promise<SatelliteTle[]> {
  try {
    const response = await fetch(SATELLITES_API_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.log("Satellite API returned non-OK status, using fallback data");
      return FALLBACK_TLES.slice(0, limit);
    }

    const data = (await response.json()) as SatelliteTle[];
    if (data.length === 0) {
      console.log("Satellite API returned empty data, using fallback");
      return FALLBACK_TLES.slice(0, limit);
    }

    return data.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch satellites, using fallback:", error);
    return FALLBACK_TLES.slice(0, limit);
  }
}
