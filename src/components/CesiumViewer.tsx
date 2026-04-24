"use client";

import { useEffect, useRef } from "react";
import {
  Cartographic,
  Color,
  EllipsoidTerrainProvider,
  Math as CesiumMath,
  Viewer,
} from "cesium";

import {
  approximateZoomLevel,
  configureCesiumBaseUrl,
  createMapboxSatelliteProvider,
  setInitialCamera,
} from "@/lib/cesium";
import { getMapboxToken, hasMapboxToken } from "@/lib/mapbox";
import { useWorldStore } from "@/store/useWorldStore";

configureCesiumBaseUrl();

export function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const imageryLayerRef = useRef<ReturnType<Viewer["imageryLayers"]["addImageryProvider"]> | null>(
    null,
  );
  const token = getMapboxToken();
  const mapboxEnabled = useWorldStore((state) => state.activeLayers.mapboxSatellite);
  const terrainEnabled = useWorldStore((state) => state.activeLayers.terrain);
  const updateGlobeSettings = useWorldStore((state) => state.updateGlobeSettings);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) {
      return;
    }

    const viewer = new Viewer(containerRef.current, {
      animation: false,
      baseLayer: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      vrButton: false,
      shouldAnimate: true,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
    });

    viewerRef.current = viewer;
    viewer.scene.globe.baseColor = Color.fromCssColorString("#02070a");
    viewer.scene.globe.enableLighting = true;
    viewer.scene.fog.enabled = true;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
    }
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    viewer.cesiumWidget.creditContainer.remove();

    if (hasMapboxToken()) {
      imageryLayerRef.current = viewer.imageryLayers.addImageryProvider(
        createMapboxSatelliteProvider(token),
      );
    }

    setInitialCamera(viewer);

    const syncCameraState = () => {
      const cartographic = Cartographic.fromCartesian(viewer.camera.positionWC);
      const cameraHeightMeters = cartographic.height;

      updateGlobeSettings({
        cameraHeightMeters,
        zoomLevel: approximateZoomLevel(cameraHeightMeters),
        coordinates: {
          latitude: CesiumMath.toDegrees(cartographic.latitude),
          longitude: CesiumMath.toDegrees(cartographic.longitude),
          altitudeMeters: cameraHeightMeters,
        },
      });
    };

    syncCameraState();
    viewer.camera.changed.addEventListener(syncCameraState);

    return () => {
      viewer.camera.changed.removeEventListener(syncCameraState);
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
      imageryLayerRef.current = null;
    };
  }, [token, updateGlobeSettings]);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer || !imageryLayerRef.current) {
      return;
    }

    imageryLayerRef.current.show = mapboxEnabled;
    viewer.scene.requestRender();
  }, [mapboxEnabled]);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    viewer.terrainProvider = new EllipsoidTerrainProvider();
    viewer.scene.globe.depthTestAgainstTerrain = terrainEnabled;
    viewer.scene.requestRender();
  }, [terrainEnabled]);

  return (
    <section className="absolute inset-0 bg-black" aria-label="Iris 3D globe">
      <div ref={containerRef} className="h-full w-full" />
      {!hasMapboxToken() ? (
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 border border-amber-400/30 bg-amber-950/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-200">
          Missing NEXT_PUBLIC_MAPBOX_TOKEN
        </div>
      ) : null}
    </section>
  );
}
