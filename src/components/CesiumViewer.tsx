"use client";

import { useEffect, useRef } from "react";
import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  Credit,
  DistanceDisplayCondition,
  DynamicAtmosphereLightingType,
  HeightReference,
  HorizontalOrigin,
  ImageryLayer,
  LabelStyle,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  SkyBox,
  SunLight,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  UrlTemplateImageryProvider,
  VerticalOrigin,
  Viewer,
  WebMercatorTilingScheme,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import type { AircraftState } from "@/lib/opensky";
import { fetchAircraftStates } from "@/lib/opensky";
import { useWorldStore } from "@/store/useWorldStore";

const CESIUM_BASE_URL = "/cesium";
const IDLE_RESUME_DELAY_MS = 4_500;
const AUTO_ROTATE_RADIANS_PER_SECOND = CesiumMath.toRadians(0.28);
const TELEMETRY_UPDATE_INTERVAL_MS = 250;
const AIRCRAFT_REFRESH_INTERVAL_MS = 15_000;

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

function approximateZoomLevel(cameraHeight: number): number {
  const earthCircumferenceMeters = 40_075_016.686;
  const viewportHeight = Math.max(window.innerHeight, 1);
  const metersPerPixel = Math.max(cameraHeight, 1) / viewportHeight;
  const rawZoom = Math.log2(earthCircumferenceMeters / (256 * metersPerPixel));

  return Math.max(0, Math.min(22, Math.round(rawZoom * 10) / 10));
}

function formatAircraftName(aircraft: AircraftState): string {
  return aircraft.callsign || aircraft.icao24.toUpperCase();
}

function formatNullableMetric(value: number | null, suffix: string, fractionDigits = 0): string {
  if (value === null) {
    return "--";
  }

  return `${value.toFixed(fractionDigits)} ${suffix}`;
}

function formatLastContact(lastContact: number | null): string {
  if (lastContact === null) {
    return "--";
  }

  return new Date(lastContact * 1000).toISOString();
}

function toAircraftEntityMetadata(aircraft: AircraftState): Record<string, string | number | boolean | null> {
  return {
    callsign: aircraft.callsign || "--",
    ICAO24: aircraft.icao24.toUpperCase(),
    country: aircraft.originCountry || "--",
    altitude: formatNullableMetric(aircraft.altitudeMeters, "m"),
    velocity: formatNullableMetric(aircraft.velocityMps, "m/s", 1),
    heading: formatNullableMetric(aircraft.headingDegrees, "deg", 0),
    lastContact: formatLastContact(aircraft.lastContact),
    source: "OpenSky",
  };
}

export default function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const mapboxImageryLayerRef = useRef<ImageryLayer | null>(null);
  const idleResumeAtRef = useRef(0);
  const lastFrameAtRef = useRef<number | null>(null);
  const lastTelemetryAtRef = useRef(0);
  const aircraftEntityIdsRef = useRef<Set<string>>(new Set());
  const aircraftByEntityIdRef = useRef<Map<string, AircraftState>>(new Map());
  const mapboxSatellite = useWorldStore((state) => state.activeLayers.mapboxSatellite);
  const aircraftLayerActive = useWorldStore((state) => state.activeLayers.aircraft);

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
      targetFrameRate: 60,
      useBrowserRecommendedResolution: false,
    });

    viewerRef.current = viewer;
    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
    viewer.cesiumWidget.creditContainer.remove();
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
      lastFrameAtRef.current = null;
    };

    const interactionOptions: AddEventListenerOptions = { passive: true };
    const canvas = viewer.scene.canvas;
    canvas.addEventListener("pointerdown", markUserInteraction, interactionOptions);
    canvas.addEventListener("wheel", markUserInteraction, interactionOptions);
    canvas.addEventListener("touchstart", markUserInteraction, interactionOptions);

    const aircraftClickHandler = new ScreenSpaceEventHandler(canvas);
    aircraftClickHandler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(movement.position) as { id?: { id?: string } } | undefined;
      const pickedId = picked?.id?.id;

      if (!pickedId?.startsWith("aircraft:")) {
        return;
      }

      const aircraft = aircraftByEntityIdRef.current.get(pickedId);
      if (!aircraft) {
        return;
      }

      useWorldStore.getState().setSelectedEntity({
        id: aircraft.icao24.toUpperCase(),
        name: formatAircraftName(aircraft),
        kind: "aircraft",
        metadata: toAircraftEntityMetadata(aircraft),
      });
    }, ScreenSpaceEventType.LEFT_CLICK);

    const removePreRender = viewer.scene.preRender.addEventListener(() => {
      const now = Date.now();
      const lastFrameAt = lastFrameAtRef.current ?? now;
      const deltaSeconds = Math.min((now - lastFrameAt) / 1000, 0.05);

      lastFrameAtRef.current = now;

      if (now >= idleResumeAtRef.current) {
        viewer.camera.rotate(Cartesian3.UNIT_Z, -AUTO_ROTATE_RADIANS_PER_SECOND * deltaSeconds);
      }

      if (now - lastTelemetryAtRef.current >= TELEMETRY_UPDATE_INTERVAL_MS) {
        lastTelemetryAtRef.current = now;
        updateTelemetry();
      }
    });

    updateTelemetry();

    return () => {
      removePreRender();
      canvas.removeEventListener("pointerdown", markUserInteraction, interactionOptions);
      canvas.removeEventListener("wheel", markUserInteraction, interactionOptions);
      canvas.removeEventListener("touchstart", markUserInteraction, interactionOptions);
      aircraftClickHandler.destroy();
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
      mapboxImageryLayerRef.current = null;
      aircraftEntityIdsRef.current = new Set();
      aircraftByEntityIdRef.current = new Map();
    };
    // The viewer and imagery provider should be created exactly once.
    // Layer visibility changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapboxImageryLayerRef.current) {
      return;
    }

    mapboxImageryLayerRef.current.show = mapboxSatellite;
    viewerRef.current?.scene.requestRender();
  }, [mapboxSatellite]);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    const removeAircraftEntities = () => {
      aircraftEntityIdsRef.current.forEach((entityId) => {
        viewer.entities.removeById(entityId);
      });
      aircraftEntityIdsRef.current.clear();
      aircraftByEntityIdRef.current.clear();

      const { selectedEntity, setSelectedEntity } = useWorldStore.getState();
      if (selectedEntity?.kind === "aircraft") {
        setSelectedEntity(null);
      }
    };

    if (!aircraftLayerActive) {
      removeAircraftEntities();
      viewer.scene.requestRender();
      return;
    }

    let cancelled = false;

    const updateAircraftEntities = async () => {
      try {
        const aircraftStates = await fetchAircraftStates();

        if (cancelled || viewer.isDestroyed()) {
          return;
        }

        const liveEntityIds = new Set<string>();

        aircraftStates.forEach((aircraft) => {
          if (!aircraft.icao24) {
            return;
          }

          const entityId = `aircraft:${aircraft.icao24}`;
          const altitudeMeters = aircraft.onGround ? 0 : aircraft.altitudeMeters ?? 0;
          const position = Cartesian3.fromDegrees(aircraft.longitude, aircraft.latitude, altitudeMeters);
          const label = formatAircraftName(aircraft);

          liveEntityIds.add(entityId);
          aircraftEntityIdsRef.current.add(entityId);
          aircraftByEntityIdRef.current.set(entityId, aircraft);

          const existingEntity = viewer.entities.getById(entityId);

          if (existingEntity) {
            existingEntity.position = new ConstantPositionProperty(position);

            if (existingEntity.label) {
              existingEntity.label.text = new ConstantProperty(label);
            }

            return;
          }

          viewer.entities.add({
            id: entityId,
            name: label,
            position,
            point: {
              pixelSize: aircraft.onGround ? 5 : 6,
              color: aircraft.onGround
                ? Color.fromCssColorString("#94a3b8").withAlpha(0.72)
                : Color.fromCssColorString("#67e8f9").withAlpha(0.86),
              outlineColor: Color.fromCssColorString("#020617").withAlpha(0.72),
              outlineWidth: 1,
              heightReference: HeightReference.NONE,
              distanceDisplayCondition: new DistanceDisplayCondition(0, 18_000_000),
              disableDepthTestDistance: 2_500_000,
            },
            label: {
              text: label,
              font: "500 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fillColor: Color.fromCssColorString("#dffcff").withAlpha(0.92),
              outlineColor: Color.fromCssColorString("#020617").withAlpha(0.9),
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              horizontalOrigin: HorizontalOrigin.CENTER,
              verticalOrigin: VerticalOrigin.BOTTOM,
              pixelOffset: new Cartesian2(0, -10),
              distanceDisplayCondition: new DistanceDisplayCondition(0, 1_400_000),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });

        aircraftEntityIdsRef.current.forEach((entityId) => {
          if (!liveEntityIds.has(entityId)) {
            viewer.entities.removeById(entityId);
            aircraftByEntityIdRef.current.delete(entityId);
          }
        });

        aircraftEntityIdsRef.current = liveEntityIds;
        viewer.scene.requestRender();
      } catch (error) {
        console.warn("OpenSky aircraft refresh failed", error);
      }
    };

    void updateAircraftEntities();
    const refreshInterval = window.setInterval(() => {
      void updateAircraftEntities();
    }, AIRCRAFT_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      removeAircraftEntities();
    };
  }, [aircraftLayerActive]);

  return <div ref={containerRef} className="fixed inset-0 h-screen w-screen bg-black" />;
}

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}
