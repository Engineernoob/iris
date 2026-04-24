export type AircraftState = {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number;
  latitude: number;
  altitudeMeters: number | null;
  velocityMps: number | null;
  headingDegrees: number | null;
  verticalRate: number | null;
  onGround: boolean;
  lastContact: number | null;
};

type OpenSkyStateVector = [
  icao24: unknown,
  callsign: unknown,
  originCountry: unknown,
  timePosition: unknown,
  lastContact: unknown,
  longitude: unknown,
  latitude: unknown,
  barometricAltitude: unknown,
  onGround: unknown,
  velocity: unknown,
  trueTrack: unknown,
  verticalRate: unknown,
  sensors: unknown,
  geometricAltitude: unknown,
  squawk: unknown,
  spi: unknown,
  positionSource: unknown,
  category?: unknown,
];

type OpenSkyResponse = {
  states?: OpenSkyStateVector[];
};

const OPEN_SKY_STATES_URL = "https://opensky-network.org/api/states/all";

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function fetchAircraftStates(): Promise<AircraftState[]> {
  const response = await fetch(OPEN_SKY_STATES_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OpenSky request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenSkyResponse;

  if (!Array.isArray(data.states)) {
    return [];
  }

  return data.states.flatMap((state) => {
    const longitude = nullableNumber(state[5]);
    const latitude = nullableNumber(state[6]);

    if (longitude === null || latitude === null) {
      return [];
    }

    return [
      {
        icao24: stringValue(state[0]),
        callsign: stringValue(state[1]),
        originCountry: stringValue(state[2]),
        longitude,
        latitude,
        altitudeMeters: nullableNumber(state[13]) ?? nullableNumber(state[7]),
        velocityMps: nullableNumber(state[9]),
        headingDegrees: nullableNumber(state[10]),
        verticalRate: nullableNumber(state[11]),
        onGround: state[8] === true,
        lastContact: nullableNumber(state[4]),
      },
    ];
  });
}
