"use client";

import type { RefObject } from "react";
import { useEffect } from "react";
import { Cartesian2, Cartographic, Math as CesiumMath, Viewer } from "cesium";

import {
  approximateZoomLevel,
  TELEMETRY_UPDATE_INTERVAL_MS,
} from "@/lib/cesiumConfig";
import { useWorldStore } from "@/store/useWorldStore";

export function useCameraTelemetry(viewerRef: RefObject<Viewer | null>, ready: boolean) {
  useEffect(() => {
    const viewer = viewerRef.current;

    if (!ready || !viewer) {
      return;
    }

    const { globe } = viewer.scene;

    const updateTelemetry = () => {
      const canvas = viewer.scene.canvas;
      const center = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
      const centerPosition = viewer.camera.pickEllipsoid(center, globe.ellipsoid);
      const cameraPosition = Cartographic.fromCartesian(viewer.camera.positionWC, globe.ellipsoid);
      const centerCartographic = centerPosition
        ? Cartographic.fromCartesian(centerPosition, globe.ellipsoid)
        : cameraPosition;

      useWorldStore.getState().updateGlobeSettings({
        cameraHeightMeters: cameraPosition.height,
        zoomLevel: approximateZoomLevel(cameraPosition.height),
        coordinates: {
          latitude: CesiumMath.toDegrees(centerCartographic.latitude),
          longitude: CesiumMath.toDegrees(centerCartographic.longitude),
          altitudeMeters: cameraPosition.height,
        },
      });
    };

    updateTelemetry();
    const telemetryInterval = window.setInterval(updateTelemetry, TELEMETRY_UPDATE_INTERVAL_MS);

    return () => {
      window.clearInterval(telemetryInterval);
    };
  }, [ready, viewerRef]);
}
