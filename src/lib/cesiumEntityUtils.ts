import type { AircraftState } from "@/lib/opensky";
import type { PropagatedSatellite, SatellitePosition } from "@/lib/satellitePropagation";
import { useWorldStore } from "@/store/useWorldStore";

export type AircraftVisualState = "airborne" | "landing" | "ground";

export function formatAircraftName(aircraft: AircraftState): string {
  return aircraft.callsign || aircraft.icao24.toUpperCase();
}

export function createAircraftEntityId(icao24: string): string {
  return `aircraft:${icao24}`;
}

export function createSatelliteEntityId(noradId: string): string {
  return `satellite:${noradId}`;
}

export function getAircraftVisualState(aircraft: AircraftState): AircraftVisualState {
  if (aircraft.onGround) {
    return "ground";
  }

  const altitudeMeters = aircraft.altitudeMeters ?? Number.POSITIVE_INFINITY;
  const descending = (aircraft.verticalRate ?? 0) < -0.5;

  if (altitudeMeters < 1_500 || (altitudeMeters < 3_000 && descending)) {
    return "landing";
  }

  return "airborne";
}

export function getAircraftVisualColor(state: AircraftVisualState): string {
  if (state === "ground") {
    return "#94a3b8";
  }

  if (state === "landing") {
    return "#fbbf24";
  }

  return "#67e8f9";
}

const ICON_CACHE = new Map<AircraftVisualState, string>();

export function getAircraftIconDataUrl(state: AircraftVisualState): string {
  const cached = ICON_CACHE.get(state);
  if (cached) {
    return cached;
  }

  const fill = getAircraftVisualColor(state);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
    <path d="M18 2 L22 8 L22 28 L18 32 L14 28 L14 8 Z" fill="${fill}" stroke="#ecfeff" stroke-opacity=".72" stroke-width="1.2"/>
    <path d="M14 10 L4 18 L14 16 Z" fill="${fill}" stroke="#ecfeff" stroke-opacity=".72" stroke-width="1"/>
    <path d="M22 10 L32 18 L22 16 Z" fill="${fill}" stroke="#ecfeff" stroke-opacity=".72" stroke-width="1"/>
    <path d="M14 28 L8 32 L14 30 Z" fill="${fill}" stroke="#ecfeff" stroke-opacity=".72" stroke-width="1"/>
    <path d="M22 28 L28 32 L22 30 Z" fill="${fill}" stroke="#ecfeff" stroke-opacity=".72" stroke-width="1"/>
    <line x1="18" y1="2" x2="18" y2="32" stroke="#020617" stroke-opacity=".25" stroke-width="0.8"/>
  </svg>`;

  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  ICON_CACHE.set(state, dataUrl);
  return dataUrl;
}

function formatNullableMetric(value: number | null, suffix: string, fractionDigits = 0): string {
  if (value === null) {
    return "--";
  }

  return `${value.toFixed(fractionDigits)} ${suffix}`;
}

function formatLastContact(lastContact: number | null): string {
  if (lastContact === null) {
    return "--";
  }

  return new Date(lastContact * 1000).toISOString();
}

export function toAircraftEntityMetadata(
  aircraft: AircraftState,
): Record<string, string | number | boolean | null> {
  return {
    callsign: aircraft.callsign || "--",
    ICAO24: aircraft.icao24.toUpperCase(),
    country: aircraft.originCountry || "--",
    altitude: formatNullableMetric(aircraft.altitudeMeters, "m"),
    velocity: formatNullableMetric(aircraft.velocityMps, "m/s", 1),
    heading: formatNullableMetric(aircraft.headingDegrees, "deg", 0),
    lastContact: formatLastContact(aircraft.lastContact),
    source: "OpenSky",
  };
}

export function toSatelliteEntityMetadata(
  satellite: PropagatedSatellite,
  position: SatellitePosition,
): Record<string, string | number | boolean | null> {
  return {
    name: satellite.name,
    NORAD: satellite.noradId,
    altitude: `${position.altitudeKm.toFixed(1)} km`,
    longitude: `${position.longitude.toFixed(4)} deg`,
    latitude: `${position.latitude.toFixed(4)} deg`,
    source: "CelesTrak",
  };
}

export function selectedEntityIdForKind(kind: "aircraft" | "satellite"): string | null {
  const selectedEntity = useWorldStore.getState().selectedEntity;

  if (selectedEntity?.kind !== kind) {
    return null;
  }

  return selectedEntity.id;
}
