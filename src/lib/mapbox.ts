const MAPBOX_STYLE = "mapbox/satellite-streets-v12";

export function getMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

export function getMapboxSatelliteTilesUrl(token = getMapboxToken()): string {
  const accessToken = encodeURIComponent(token);

  return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/256/{z}/{x}/{y}@2x?access_token=${accessToken}`;
}

export function hasMapboxToken(): boolean {
  return getMapboxToken().trim().length > 0;
}
