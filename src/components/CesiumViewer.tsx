"use client";

import { useEffect, useRef } from "react";
import {
  Cartesian3,
  Credit,
  Math as CesiumMath,
  UrlTemplateImageryProvider,
  Viewer,
  WebMercatorTilingScheme,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const CESIUM_BASE_URL = "/cesium";

function createMapboxImageryProvider(token: string): UrlTemplateImageryProvider {
  return new UrlTemplateImageryProvider({
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(
      token,
    )}`,
    credit: new Credit("Mapbox Satellite Streets"),
    maximumLevel: 22,
    tilingScheme: new WebMercatorTilingScheme(),
  });
}

export default function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) {
      return;
    }

    window.CESIUM_BASE_URL = CESIUM_BASE_URL;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    const viewer = new Viewer(containerRef.current, {
      animation: false,
      baseLayer: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      vrButton: false,
      shouldAnimate: true,
    });

    viewerRef.current = viewer;
    viewer.cesiumWidget.creditContainer.remove();

    if (token) {
      viewer.imageryLayers.addImageryProvider(createMapboxImageryProvider(token));
    }

    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(-98.5795, 39.8283, 18_500_000),
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-90),
        roll: 0,
      },
    });

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 h-screen w-screen bg-black" />;
}

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}
