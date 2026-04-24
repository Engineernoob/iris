import type { Viewer } from "cesium";
import {
  Cartesian3,
  Credit,
  Math as CesiumMath,
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
} from "cesium";

import { getMapboxSatelliteTilesUrl } from "@/lib/mapbox";

export const CESIUM_BASE_URL = "/cesium";

export function configureCesiumBaseUrl(): void {
  if (typeof window !== "undefined") {
    window.CESIUM_BASE_URL = CESIUM_BASE_URL;
  }
}

export function createMapboxSatelliteProvider(token: string): UrlTemplateImageryProvider {
  return new UrlTemplateImageryProvider({
    url: getMapboxSatelliteTilesUrl(token),
    credit: new Credit("Mapbox Satellite Streets"),
    maximumLevel: 22,
    tilingScheme: new WebMercatorTilingScheme(),
  });
}

export function setInitialCamera(viewer: Viewer): void {
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(-98.5795, 39.8283, 18_500_000),
    orientation: {
      heading: 0,
      pitch: CesiumMath.toRadians(-90),
      roll: 0,
    },
  });
}

export function approximateZoomLevel(cameraHeight: number): number {
  const earthCircumferenceMeters = 40_075_016.686;
  const tileSize = 256;
  const viewportHeight = typeof window === "undefined" ? 1080 : window.innerHeight;
  const metersPerPixel = Math.max(cameraHeight, 1) / Math.max(viewportHeight, 1);
  const rawZoom = Math.log2(earthCircumferenceMeters / (tileSize * metersPerPixel));

  return Math.max(0, Math.min(22, Math.round(rawZoom * 10) / 10));
}

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}
