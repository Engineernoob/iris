import type { AircraftState } from "@/lib/opensky";
import type { PropagatedSatellite, SatellitePosition } from "@/lib/satellitePropagation";

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
