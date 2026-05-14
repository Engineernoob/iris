"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { Cartesian2, Cartographic, Math as CesiumMath, Viewer } from "cesium";

import {
  approximateZoomLevel,
  TELEMETRY_UPDATE_INTERVAL_MS,
} from "@/lib/cesiumConfig";
import { useWorldStore } from "@/store/useWorldStore";

const CAMERA_HEIGHT_UPDATE_THRESHOLD_METERS = 250;
const COORDINATE_UPDATE_THRESHOLD_DEGREES = 0.0025;

type LastTelemetrySnapshot = {
  cameraHeightMeters: number;
  zoomLevel: number;
  latitude: number;
  longitude: number;
} | null;

export function useCameraTelemetry(viewerRef: RefObject<Viewer | null>, ready: boolean) {
  const lastTelemetryRef = useRef<LastTelemetrySnapshot>(null);

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
      const cameraHeightMeters = cameraPosition.height;
      const zoomLevel = approximateZoomLevel(cameraHeightMeters);
      const latitude = CesiumMath.toDegrees(centerCartographic.latitude);
      const longitude = CesiumMath.toDegrees(centerCartographic.longitude);
      const previous = lastTelemetryRef.current;

      if (
        previous &&
        Math.abs(previous.cameraHeightMeters - cameraHeightMeters) < CAMERA_HEIGHT_UPDATE_THRESHOLD_METERS &&
        previous.zoomLevel === zoomLevel &&
        Math.abs(previous.latitude - latitude) < COORDINATE_UPDATE_THRESHOLD_DEGREES &&
        Math.abs(previous.longitude - longitude) < COORDINATE_UPDATE_THRESHOLD_DEGREES
      ) {
        return;
      }

      lastTelemetryRef.current = {
        cameraHeightMeters,
        zoomLevel,
        latitude,
        longitude,
      };

      useWorldStore.getState().updateGlobeSettings({
        cameraHeightMeters,
        zoomLevel,
        coordinates: {
          latitude,
          longitude,
          altitudeMeters: cameraHeightMeters,
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
