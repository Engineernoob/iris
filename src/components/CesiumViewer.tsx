"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cartesian3,
  Color,
  Credit,
  DynamicAtmosphereLightingType,
  ImageryLayer,
  Math as CesiumMath,
  SkyBox,
  SunLight,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  UrlTemplateImageryProvider,
  Viewer,
  WebMercatorTilingScheme,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import { useAircraftLayer } from "@/hooks/useAircraftLayer";
import { useSatelliteLayer } from "@/hooks/useSatelliteLayer";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useWorldStore } from "@/store/useWorldStore";

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
  const mapboxImageryLayerRef = useRef<ImageryLayer | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const mapboxSatellite = useWorldStore((state) => state.activeLayers.mapboxSatellite);
  const aircraftLayerActive = useWorldStore((state) => state.activeLayers.aircraft);
  const satellitesLayerActive = useWorldStore((state) => state.activeLayers.satellites);

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
      skyBox: SkyBox.createEarthSkyBox(),
      shouldAnimate: true,
      targetFrameRate: 30,
      useBrowserRecommendedResolution: false,
    });

    viewerRef.current = viewer;
    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
    viewer.cesiumWidget.creditContainer.remove();
    viewer.scene.requestRenderMode = true;
    viewer.scene.maximumRenderTimeChange = Number.POSITIVE_INFINITY;
    viewer.scene.backgroundColor = Color.fromCssColorString("#02040a");
    viewer.scene.highDynamicRange = true;
    viewer.scene.sunBloom = true;
    viewer.scene.light = new SunLight({
      color: Color.WHITE,
      intensity: 3.2,
    });

    viewer.scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.SUNLIGHT;
    viewer.scene.atmosphere.lightIntensity = 14.0;
    viewer.scene.atmosphere.saturationShift = -0.08;
    viewer.scene.atmosphere.brightnessShift = -0.08;

    const { globe } = viewer.scene;
    globe.baseColor = Color.fromCssColorString("#030812");
    globe.enableLighting = true;
    globe.dynamicAtmosphereLighting = true;
    globe.dynamicAtmosphereLightingFromSun = true;
    globe.showGroundAtmosphere = true;
    globe.atmosphereLightIntensity = 18.0;
    globe.atmosphereSaturationShift = -0.04;
    globe.atmosphereBrightnessShift = -0.08;
    globe.lambertDiffuseMultiplier = 0.82;
    globe.lightingFadeOutDistance = 8_000_000;
    globe.lightingFadeInDistance = 28_000_000;
    globe.nightFadeOutDistance = 1_500_000;
    globe.nightFadeInDistance = 18_000_000;
    globe.maximumScreenSpaceError = 2.0;
    globe.tileCacheSize = 512;
    globe.preloadAncestors = true;
    globe.preloadSiblings = true;

    const skyAtmosphere = viewer.scene.skyAtmosphere;
    if (skyAtmosphere) {
      skyAtmosphere.show = true;
      skyAtmosphere.perFragmentAtmosphere = true;
      skyAtmosphere.atmosphereLightIntensity = 55.0;
      skyAtmosphere.saturationShift = -0.05;
      skyAtmosphere.brightnessShift = -0.04;
    }

    if (token) {
      const mapboxLayer = new ImageryLayer(createMapboxImageryProvider(token), {
        brightness: 0.86,
        contrast: 1.18,
        saturation: 0.92,
        gamma: 0.94,
        dayAlpha: 1.0,
        nightAlpha: 0.22,
        minificationFilter: TextureMinificationFilter.LINEAR,
        magnificationFilter: TextureMagnificationFilter.LINEAR,
        maximumAnisotropy: 16,
        show: mapboxSatellite,
      });

      viewer.imageryLayers.add(mapboxLayer);
      mapboxImageryLayerRef.current = mapboxLayer;
    }

    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(-48.5, 42.5, 11_800_000),
      orientation: {
        heading: CesiumMath.toRadians(318),
        pitch: CesiumMath.toRadians(-58),
        roll: 0,
      },
    });
    viewer.scene.requestRender();
    setViewerReady(true);

    return () => {
      setViewerReady(false);
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
      mapboxImageryLayerRef.current = null;
    };
    // The viewer and imagery provider should be created exactly once.
    // Layer visibility changes are handled by the effects and hooks below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapboxImageryLayerRef.current) {
      return;
    }

    mapboxImageryLayerRef.current.show = mapboxSatellite;
    viewerRef.current?.scene.requestRender();
  }, [mapboxSatellite]);

  useTelemetry(viewerRef, viewerReady);
  useAircraftLayer(viewerRef, viewerReady, aircraftLayerActive);
  useSatelliteLayer(viewerRef, viewerReady, satellitesLayerActive);

  return <div ref={containerRef} className="fixed inset-0 h-screen w-screen bg-black" />;
}

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}
