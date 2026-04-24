"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import type { ImageryLayer, Viewer } from "cesium";

import { CESIUM_BASE_URL, configureViewer, createMapboxLayer } from "@/lib/cesiumConfig";
import { useWorldStore } from "@/store/useWorldStore";

export function useCesiumBase(containerRef: RefObject<HTMLDivElement | null>) {
  const viewerRef = useRef<Viewer | null>(null);
  const mapboxImageryLayerRef = useRef<ImageryLayer | null>(null);
  const [ready, setReady] = useState(false);
  const mapboxSatellite = useWorldStore((state) => state.activeLayers.mapboxSatellite);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) {
      return;
    }

    window.CESIUM_BASE_URL = CESIUM_BASE_URL;

    const viewer = configureViewer(containerRef.current);
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

    viewerRef.current = viewer;

    if (token) {
      const mapboxLayer = createMapboxLayer(
        token,
        useWorldStore.getState().activeLayers.mapboxSatellite,
      );

      viewer.imageryLayers.add(mapboxLayer);
      mapboxImageryLayerRef.current = mapboxLayer;
    }

    viewer.scene.requestRender();
    setReady(true);

    const removeCameraChanged = viewer.camera.changed.addEventListener(() => {
      viewer.scene.requestRender();
    });
    const removeCameraMoveStart = viewer.camera.moveStart.addEventListener(() => {
      viewer.scene.requestRender();
    });
    const removeCameraMoveEnd = viewer.camera.moveEnd.addEventListener(() => {
      viewer.scene.requestRender();
    });

    return () => {
      removeCameraChanged();
      removeCameraMoveStart();
      removeCameraMoveEnd();
      setReady(false);
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
      mapboxImageryLayerRef.current = null;
    };
  }, [containerRef]);

  useEffect(() => {
    if (!mapboxImageryLayerRef.current) {
      return;
    }

    mapboxImageryLayerRef.current.show = mapboxSatellite;
    viewerRef.current?.scene.requestRender();
  }, [mapboxSatellite]);

  return { viewerRef, ready };
}

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}
