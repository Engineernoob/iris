import { twoline2satrec } from "satellite.js";
import { gstime, propagate } from "satellite.js";
import { degreesLat, degreesLong, eciToGeodetic } from "satellite.js";
import type { SatRec } from "satellite.js";

import type { SatelliteTle } from "@/lib/celestrak";

export type PropagatedSatellite = SatelliteTle & {
  satrec: SatRec;
};

export type SatellitePosition = {
  longitude: number;
  latitude: number;
  altitudeKm: number;
};

export function createPropagatedSatellite(tle: SatelliteTle): PropagatedSatellite | null {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);

    return {
      ...tle,
      satrec,
    };
  } catch {
    return null;
  }
}

export function propagateSatellitePosition(
  satellite: PropagatedSatellite,
  date = new Date(),
): SatellitePosition | null {
  const positionAndVelocity = propagate(satellite.satrec, date);
  const positionEci = positionAndVelocity.position;

  if (!positionEci) {
    return null;
  }

  const geodetic = eciToGeodetic(positionEci, gstime(date));

  return {
    longitude: degreesLong(geodetic.longitude),
    latitude: degreesLat(geodetic.latitude),
    altitudeKm: geodetic.height,
  };
}
