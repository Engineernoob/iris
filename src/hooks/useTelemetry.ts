"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Math as CesiumMath,
  Viewer,
} from "cesium";

import { useWorldStore } from "@/store/useWorldStore";

const IDLE_RESUME_DELAY_MS = 4_500;
const AUTO_ROTATE_RADIANS_PER_SECOND = CesiumMath.toRadians(0.28);
const TELEMETRY_UPDATE_INTERVAL_MS = 500;
const AUTO_ROTATE_INTERVAL_MS = 1000 / 30;

function approximateZoomLevel(cameraHeight: number): number {
  const earthCircumferenceMeters = 40_075_016.686;
  const viewportHeight = Math.max(window.innerHeight, 1);
  const metersPerPixel = Math.max(cameraHeight, 1) / viewportHeight;
  const rawZoom = Math.log2(earthCircumferenceMeters / (256 * metersPerPixel));

  return Math.max(0, Math.min(22, Math.round(rawZoom * 10) / 10));
}

export function useTelemetry(viewerRef: RefObject<Viewer | null>, ready: boolean) {
  const idleResumeAtRef = useRef(0);
  const lastRotateAtRef = useRef<number | null>(null);

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

    const markUserInteraction = () => {
      idleResumeAtRef.current = Date.now() + IDLE_RESUME_DELAY_MS;
      lastRotateAtRef.current = null;
    };

    const canvas = viewer.scene.canvas;
    const interactionOptions: AddEventListenerOptions = { passive: true };

    canvas.addEventListener("pointerdown", markUserInteraction, interactionOptions);
    canvas.addEventListener("wheel", markUserInteraction, interactionOptions);
    canvas.addEventListener("touchstart", markUserInteraction, interactionOptions);

    const telemetryInterval = window.setInterval(updateTelemetry, TELEMETRY_UPDATE_INTERVAL_MS);
    const rotateInterval = window.setInterval(() => {
      const now = Date.now();

      if (now < idleResumeAtRef.current || viewer.isDestroyed()) {
        lastRotateAtRef.current = null;
        return;
      }

      const lastRotateAt = lastRotateAtRef.current ?? now;
      const deltaSeconds = Math.min((now - lastRotateAt) / 1000, 0.12);
      lastRotateAtRef.current = now;

      if (deltaSeconds > 0) {
        viewer.camera.rotate(Cartesian3.UNIT_Z, -AUTO_ROTATE_RADIANS_PER_SECOND * deltaSeconds);
        viewer.scene.requestRender();
      }
    }, AUTO_ROTATE_INTERVAL_MS);

    updateTelemetry();

    return () => {
      window.clearInterval(telemetryInterval);
      window.clearInterval(rotateInterval);
      canvas.removeEventListener("pointerdown", markUserInteraction, interactionOptions);
      canvas.removeEventListener("wheel", markUserInteraction, interactionOptions);
      canvas.removeEventListener("touchstart", markUserInteraction, interactionOptions);
    };
  }, [ready, viewerRef]);
}
