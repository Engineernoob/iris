"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { Cartesian3, Viewer } from "cesium";

import {
  AUTO_ROTATE_INTERVAL_MS,
  AUTO_ROTATE_RADIANS_PER_SECOND,
  IDLE_RESUME_DELAY_MS,
} from "@/lib/cesiumConfig";

export function useAutoRotate(viewerRef: RefObject<Viewer | null>, ready: boolean) {
  const idleResumeAtRef = useRef(0);
  const lastRotateAtRef = useRef<number | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!ready || !viewer) {
      return;
    }

    const markUserInteraction = () => {
      idleResumeAtRef.current = Date.now() + IDLE_RESUME_DELAY_MS;
      lastRotateAtRef.current = null;
    };

    const canvas = viewer.scene.canvas;
    const interactionOptions: AddEventListenerOptions = { passive: true };

    canvas.addEventListener("pointerdown", markUserInteraction, interactionOptions);
    canvas.addEventListener("wheel", markUserInteraction, interactionOptions);
    canvas.addEventListener("touchstart", markUserInteraction, interactionOptions);

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

    return () => {
      window.clearInterval(rotateInterval);
      canvas.removeEventListener("pointerdown", markUserInteraction, interactionOptions);
      canvas.removeEventListener("wheel", markUserInteraction, interactionOptions);
      canvas.removeEventListener("touchstart", markUserInteraction, interactionOptions);
    };
  }, [ready, viewerRef]);
}
