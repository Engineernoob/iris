export type GdeltEvent = {
  id: string;
  date: string;
  actor1Name: string;
  actor2Name: string;
  eventCode: string;
  eventBaseCode: string;
  eventRootCode: string;
  quadrant: number;
  goldstein: number;
  lat: number;
  lon: number;
  numMentions: number;
  numSources: number;
  numArticles: number;
  avgTone: number;
  url: string;
};

export type GdeltEventWithId = GdeltEvent & {
  entityId: string;
};

const GDELT_API_URL = "/api/gdelt";
const GDELT_CACHE_TTL_MS = 900_000; // 15 minutes

let cachedEvents: GdeltEventWithId[] = [];
let cachedAt = 0;

function parseGdeltCsv(csvText: string): GdeltEvent[] {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const parts = line.split("\t");
    return {
      id: parts[0] || "",
      date: parts[1] || "",
      actor1Name: parts[5] || "",
      actor2Name: parts[15] || "",
      eventCode: parts[26] || "",
      eventBaseCode: parts[27] || "",
      eventRootCode: parts[28] || "",
      quadrant: parseInt(parts[30] || "0", 10),
      goldstein: parseFloat(parts[31] || "0"),
      lat: parseFloat(parts[49] || "0"),
      lon: parseFloat(parts[50] || "0"),
      numMentions: parseInt(parts[32] || "0", 10),
      numSources: parseInt(parts[33] || "0", 10),
      numArticles: parseInt(parts[34] || "0", 10),
      avgTone: parseFloat(parts[35] || "0"),
      url: parts[57] || "",
    };
  }).filter((event) => event.lat !== 0 && event.lon !== 0);
}

export function getEventColor(eventBaseCode: string): string {
  const code = eventBaseCode.toLowerCase();
  if (code.startsWith("1")) return "#3b82f6"; // Political
  if (code.startsWith("2")) return "#ef4444"; // Conflict
  if (code.startsWith("3")) return "#f97316"; // Protest
  if (code.startsWith("4")) return "#22c55e"; // Mediation
  if (code.startsWith("5")) return "#a855f7"; // Appeal
  if (code.startsWith("6")) return "#06b6d4"; // Threat
  if (code.startsWith("7")) return "#eab308"; // Reduce
  if (code.startsWith("8")) return "#ec4899"; // Investigate
  if (code.startsWith("9")) return "#6366f1"; // Demand
  if (code.startsWith("10")) return "#14b8a6"; // Disapprove
  if (code.startsWith("11")) return "#f59e0b"; // Reject
  if (code.startsWith("12")) return "#10b981"; // Threaten
  if (code.startsWith("13")) return "#8b5cf6"; // Military
  if (code.startsWith("14")) return "#f43f5e"; // Destroy
  if (code.startsWith("15")) return "#0ea5e9"; // Injure
  if (code.startsWith("16")) return "#dc2626"; // Kill
  if (code.startsWith("17")) return "#84cc16"; // Arrest
  if (code.startsWith("18")) return "#06b6d4"; // Disarm
  if (code.startsWith("19")) return "#a855f7"; // Release
  if (code.startsWith("20")) return "#22c55e"; // Coerce
  return "#6b7280";
}

export function getEventLabel(event: GdeltEvent): string {
  const actor1 = event.actor1Name || "Unknown";
  const actor2 = event.actor2Name || "Unknown";
  return `${actor1} → ${actor2}`;
}

export function getEventColorForId(entityId: string): string {
  const event = cachedEvents.find((e) => e.entityId === entityId);
  if (!event) return "#6b7280";
  return getEventColor(event.eventBaseCode);
}

export function getEventLabelForId(entityId: string): string {
  const event = cachedEvents.find((e) => e.entityId === entityId);
  if (!event) return "Unknown Event";
  return getEventLabel(event);
}

export function formatGdeltEvent(event: GdeltEvent): Record<string, string | number> {
  return {
    "Actor 1": event.actor1Name || "--",
    "Actor 2": event.actor2Name || "--",
    "Event Code": event.eventCode,
    "Goldstein Scale": event.goldstein.toFixed(2),
    "Tone": event.avgTone.toFixed(2),
    "Mentions": event.numMentions,
    "Articles": event.numArticles,
    "Latitude": event.lat.toFixed(4),
    "Longitude": event.lon.toFixed(4),
  };
}

export async function fetchGdeltEvents(limit = 100): Promise<GdeltEventWithId[]> {
  try {
    const response = await fetch(GDELT_API_URL, { cache: "no-store" });

    if (!response.ok) {
      if (cachedEvents.length > 0) {
        return cachedEvents.slice(0, limit);
      }
      return [];
    }

    const text = await response.text();
    const events = parseGdeltCsv(text).map((event, index) => ({
      ...event,
      entityId: `gdelt:${event.id}_${index}`,
    }));

    cachedEvents = events;
    cachedAt = Date.now();

    return events.slice(0, limit);
  } catch (error) {
    console.error("GDELT fetch error:", error);
    if (cachedEvents.length > 0 && Date.now() - cachedAt < GDELT_CACHE_TTL_MS) {
      return cachedEvents.slice(0, limit);
    }
    return [];
  }
}
