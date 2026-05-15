"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { type GeoJSONSource, type MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import {
  createAircraftEntityId,
  createSatelliteEntityId,
  formatAircraftName,
  getAircraftVisualColor,
  getAircraftVisualState,
  toAircraftEntityMetadata,
  toSatelliteEntityMetadata,
} from "@/lib/entityUtils";
import { fetchActiveSatelliteTles } from "@/lib/celestrak";
import { fetchEarthquakeEvents, formatEarthquakeEvent } from "@/lib/earthquakes";
import { fetchWithBackoff, warnFeedFailureOnce } from "@/lib/feedRetry";
import { fetchGdeltEvents, formatGdeltEvent, getEventColor, getEventLabel } from "@/lib/gdelt";
import { fetchHumanitarianReports, formatHumanitarianReport } from "@/lib/humanitarian";
import { fetchImageryFootprints, formatImageryFootprint } from "@/lib/imagery";
import type { AircraftState } from "@/lib/opensky";
import { fetchAircraftStates } from "@/lib/opensky";
import type { PropagatedSatellite, SatellitePosition } from "@/lib/satellitePropagation";
import {
  createPropagatedSatellite,
  propagateSatellitePosition,
} from "@/lib/satellitePropagation";
import { useWorldStore, type SelectedEntity } from "@/store/useWorldStore";
import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const AIRCRAFT_SOURCE_ID = "iris-aircraft";
const SATELLITE_SOURCE_ID = "iris-satellites";
const GDELT_SOURCE_ID = "iris-gdelt";
const EARTHQUAKE_SOURCE_ID = "iris-earthquakes";
const HUMANITARIAN_SOURCE_ID = "iris-humanitarian";
const IMAGERY_SOURCE_ID = "iris-imagery";
const AIRCRAFT_TRAIL_SOURCE_ID = "iris-aircraft-trail";
const SATELLITE_TRAIL_SOURCE_ID = "iris-satellite-trail";
const MARITIME_SOURCE_ID = "iris-maritime-density";
const MARINE_CADASTRE_AIS_TILE_URL =
  "https://coast.noaa.gov/arcgis/rest/services/MarineCadastre/AISVesselTransitCounts2025/MapServer/tile/{z}/{y}/{x}";
const GDELT_INTERVAL_MS = 60_000;
const EARTHQUAKE_INTERVAL_MS = 300_000;
const HUMANITARIAN_INTERVAL_MS = 900_000;
const IMAGERY_INTERVAL_MS = 3_600_000;
const MAX_GDELT_EVENTS = 50;
const MAX_EARTHQUAKES = 80;
const MAX_HUMANITARIAN_REPORTS = 40;
const MAX_IMAGERY_FOOTPRINTS = 24;
const AIRCRAFT_REFRESH_INTERVAL_MS = 30_000;
const INITIAL_CAMERA_HEIGHT_METERS = 5_000_000;
const MAX_RENDERED_AIRCRAFT = 80;
const MAX_RENDERED_SATELLITES = 30;
const SATELLITE_UPDATE_INTERVAL_MS = 15_000;
const EMPTY_POINTS: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };
const EMPTY_LINE: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };
const EMPTY_POLYGONS: FeatureCollection<Polygon> = { type: "FeatureCollection", features: [] };

type PointProperties = {
  entityId: string;
  label: string;
  color: string;
  icon: string;
  rotation: number;
  kind: NonNullable<SelectedEntity>["kind"];
};

type DataSourceIcon = "aircraft" | "satellite" | "earthquake" | "gdelt" | "humanitarian";

const dataSourceIconId: Record<DataSourceIcon, string> = {
  aircraft: "iris-icon-aircraft",
  satellite: "iris-icon-satellite",
  earthquake: "iris-icon-earthquake",
  gdelt: "iris-icon-gdelt",
  humanitarian: "iris-icon-humanitarian",
};

function selectedEntityIdForKind(kind: "aircraft" | "satellite"): string | null {
  const selectedEntity = useWorldStore.getState().selectedEntity;

  if (selectedEntity?.kind !== kind) {
    return null;
  }

  return selectedEntity.id;
}

function entityKeyForSelection(entity: NonNullable<SelectedEntity>): string {
  if (entity.kind === "aircraft") {
    return createAircraftEntityId(entity.id.toLowerCase());
  }

  if (entity.kind === "satellite") {
    return createSatelliteEntityId(entity.id);
  }

  return entity.id;
}

function emptyLine(): FeatureCollection<LineString> {
  return EMPTY_LINE;
}

function pointCollection(features: Array<Feature<Point, PointProperties>>): FeatureCollection<Point, PointProperties> {
  return { type: "FeatureCollection", features };
}

function lineCollection(coordinates: Array<[number, number]>): FeatureCollection<LineString> {
  if (coordinates.length < 2) {
    return emptyLine();
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    ],
  };
}

function polygonCollection(features: Array<Feature<Polygon, PointProperties>>): FeatureCollection<Polygon, PointProperties> {
  return { type: "FeatureCollection", features };
}

function createIconImageData(icon: DataSourceIcon, color: string): ImageData {
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create map icon canvas");
  }

  context.clearRect(0, 0, size, size);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = color;
  context.shadowBlur = 10;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 4;

  if (icon === "aircraft") {
    context.beginPath();
    context.moveTo(32, 8);
    context.lineTo(39, 30);
    context.lineTo(56, 38);
    context.lineTo(54, 45);
    context.lineTo(37, 41);
    context.lineTo(35, 55);
    context.lineTo(29, 55);
    context.lineTo(27, 41);
    context.lineTo(10, 45);
    context.lineTo(8, 38);
    context.lineTo(25, 30);
    context.closePath();
    context.fill();
    return context.getImageData(0, 0, size, size);
  }

  if (icon === "satellite") {
    context.save();
    context.translate(32, 32);
    context.rotate(-Math.PI / 5);
    context.fillRect(-8, -8, 16, 16);
    context.strokeRect(-27, -7, 13, 14);
    context.strokeRect(14, -7, 13, 14);
    context.beginPath();
    context.moveTo(-14, 0);
    context.lineTo(-8, 0);
    context.moveTo(8, 0);
    context.lineTo(14, 0);
    context.stroke();
    context.restore();
    return context.getImageData(0, 0, size, size);
  }

  if (icon === "earthquake") {
    context.beginPath();
    context.moveTo(32, 7);
    context.lineTo(56, 32);
    context.lineTo(32, 57);
    context.lineTo(8, 32);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(23, 18);
    context.lineTo(34, 30);
    context.lineTo(27, 33);
    context.lineTo(41, 47);
    context.stroke();
    return context.getImageData(0, 0, size, size);
  }

  if (icon === "humanitarian") {
    context.fillRect(26, 10, 12, 44);
    context.fillRect(10, 26, 44, 12);
    return context.getImageData(0, 0, size, size);
  }

  context.beginPath();
  context.moveTo(32, 9);
  context.lineTo(55, 22);
  context.lineTo(55, 43);
  context.lineTo(32, 56);
  context.lineTo(9, 43);
  context.lineTo(9, 22);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.moveTo(21, 32);
  context.lineTo(30, 41);
  context.lineTo(44, 23);
  context.stroke();

  return context.getImageData(0, 0, size, size);
}

function ensureDataSourceIcons(map: mapboxgl.Map): void {
  const icons: Array<[DataSourceIcon, string]> = [
    ["aircraft", "#67e8f9"],
    ["satellite", "#a7f3d0"],
    ["earthquake", "#facc15"],
    ["gdelt", "#c084fc"],
    ["humanitarian", "#fb7185"],
  ];

  icons.forEach(([icon, color]) => {
    const imageId = dataSourceIconId[icon];
    if (!map.hasImage(imageId)) {
      map.addImage(imageId, createIconImageData(icon, color), { pixelRatio: 2 });
    }
  });
}

function getSource(map: mapboxgl.Map, sourceId: string): GeoJSONSource | null {
  return (map.getSource(sourceId) as GeoJSONSource | undefined) ?? null;
}

function setSourceData(map: mapboxgl.Map, sourceId: string, data: FeatureCollection): void {
  getSource(map, sourceId)?.setData(data);
}

function cameraHeightFromZoom(map: mapboxgl.Map): number {
  const earthCircumferenceMeters = 40_075_016.686;
  const metersPerPixel = earthCircumferenceMeters / (256 * 2 ** map.getZoom());

  return Math.max(1, metersPerPixel * map.getCanvas().clientHeight);
}

function zoomFromCameraHeight(cameraHeightMeters: number): number {
  const earthCircumferenceMeters = 40_075_016.686;
  const viewportHeight = typeof window === "undefined" ? 900 : Math.max(window.innerHeight, 1);
  const metersPerPixel = Math.max(cameraHeightMeters, 1) / viewportHeight;

  return Math.max(0, Math.min(22, Math.log2(earthCircumferenceMeters / (256 * metersPerPixel))));
}

function selectAircraftForRender(aircraftStates: AircraftState[]): AircraftState[] {
  return aircraftStates
    .filter((aircraft) => aircraft.icao24)
    .sort((first, second) => {
      if (first.onGround !== second.onGround) {
        return first.onGround ? 1 : -1;
      }

      return (second.altitudeMeters ?? -1) - (first.altitudeMeters ?? -1);
    })
    .slice(0, MAX_RENDERED_AIRCRAFT);
}

function createPointFeature(
  entityKey: string,
  entity: SelectedEntity,
  coordinates: [number, number],
  color: string,
  icon: DataSourceIcon,
  rotation = 0,
): Feature<Point, PointProperties> {
  if (!entity) {
    throw new Error("Cannot create map feature without an entity");
  }

  return {
    type: "Feature",
    id: entityKey,
    properties: {
      entityId: entityKey,
      label: entity.name,
      kind: entity.kind,
      color,
      icon: dataSourceIconId[icon],
      rotation,
    },
    geometry: {
      type: "Point",
      coordinates,
    },
  };
}

function addGeoJsonSource(map: mapboxgl.Map, sourceId: string, data: FeatureCollection): void {
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data,
    });
  }
}

function setLayerVisibility(map: mapboxgl.Map, layerId: string, visible: boolean): void {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

function ensureMapLayers(map: mapboxgl.Map): void {
  ensureDataSourceIcons(map);
  addGeoJsonSource(map, AIRCRAFT_SOURCE_ID, EMPTY_POINTS);
  addGeoJsonSource(map, SATELLITE_SOURCE_ID, EMPTY_POINTS);
  addGeoJsonSource(map, GDELT_SOURCE_ID, EMPTY_POINTS);
  addGeoJsonSource(map, EARTHQUAKE_SOURCE_ID, EMPTY_POINTS);
  addGeoJsonSource(map, HUMANITARIAN_SOURCE_ID, EMPTY_POINTS);
  addGeoJsonSource(map, IMAGERY_SOURCE_ID, EMPTY_POLYGONS);
  addGeoJsonSource(map, AIRCRAFT_TRAIL_SOURCE_ID, EMPTY_LINE);
  addGeoJsonSource(map, SATELLITE_TRAIL_SOURCE_ID, EMPTY_LINE);

  if (!map.getSource(MARITIME_SOURCE_ID)) {
    map.addSource(MARITIME_SOURCE_ID, {
      type: "raster",
      tiles: [MARINE_CADASTRE_AIS_TILE_URL],
      tileSize: 256,
    });
  }

  if (!map.getLayer("iris-maritime-density")) {
    map.addLayer({
      id: "iris-maritime-density",
      source: MARITIME_SOURCE_ID,
      type: "raster",
      paint: {
        "raster-opacity": 0.45,
        "raster-saturation": 0.2,
      },
    });
  }

  if (!map.getLayer("iris-imagery-footprints")) {
    map.addLayer({
      id: "iris-imagery-footprints",
      source: IMAGERY_SOURCE_ID,
      type: "fill",
      paint: {
        "fill-color": "#f59e0b",
        "fill-opacity": 0.14,
        "fill-outline-color": "#fef3c7",
      },
    });
  }

  if (!map.getLayer("iris-imagery-outlines")) {
    map.addLayer({
      id: "iris-imagery-outlines",
      source: IMAGERY_SOURCE_ID,
      type: "line",
      paint: {
        "line-color": "#fbbf24",
        "line-opacity": 0.8,
        "line-width": 1.4,
      },
    });
  }

  if (!map.getLayer("iris-aircraft-trail")) {
    map.addLayer({
      id: "iris-aircraft-trail",
      source: AIRCRAFT_TRAIL_SOURCE_ID,
      type: "line",
      paint: {
        "line-color": "#67e8f9",
        "line-opacity": 0.7,
        "line-width": 2,
      },
    });
  }

  if (!map.getLayer("iris-satellite-trail")) {
    map.addLayer({
      id: "iris-satellite-trail",
      source: SATELLITE_TRAIL_SOURCE_ID,
      type: "line",
      paint: {
        "line-color": "#a7f3d0",
        "line-opacity": 0.7,
        "line-width": 2,
      },
    });
  }

  if (!map.getLayer("iris-gdelt-points")) {
    map.addLayer({
      id: "iris-gdelt-points",
      source: GDELT_SOURCE_ID,
      type: "symbol",
      layout: {
        "icon-image": ["get", "icon"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0.38, 5, 0.54, 10, 0.72],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": 0.9,
      },
    });
  }

  if (!map.getLayer("iris-earthquake-points")) {
    map.addLayer({
      id: "iris-earthquake-points",
      source: EARTHQUAKE_SOURCE_ID,
      type: "symbol",
      layout: {
        "icon-image": ["get", "icon"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0.42, 5, 0.62, 10, 0.84],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": 0.92,
      },
    });
  }

  if (!map.getLayer("iris-humanitarian-points")) {
    map.addLayer({
      id: "iris-humanitarian-points",
      source: HUMANITARIAN_SOURCE_ID,
      type: "symbol",
      layout: {
        "icon-image": ["get", "icon"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0.38, 5, 0.58, 10, 0.78],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": 0.9,
      },
    });
  }

  if (!map.getLayer("iris-satellite-points")) {
    map.addLayer({
      id: "iris-satellite-points",
      source: SATELLITE_SOURCE_ID,
      type: "symbol",
      layout: {
        "icon-image": ["get", "icon"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0.34, 5, 0.5, 10, 0.68],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": 0.94,
      },
    });
  }

  if (!map.getLayer("iris-aircraft-points")) {
    map.addLayer({
      id: "iris-aircraft-points",
      source: AIRCRAFT_SOURCE_ID,
      type: "symbol",
      layout: {
        "icon-image": ["get", "icon"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0.34, 5, 0.55, 10, 0.78],
        "icon-rotate": ["get", "rotation"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": 0.95,
      },
    });
  }

  if (!map.getLayer("iris-asset-labels")) {
    map.addLayer({
      id: "iris-asset-labels",
      source: AIRCRAFT_SOURCE_ID,
      type: "symbol",
      minzoom: 4,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-offset": [0, 1.15],
        "text-anchor": "top",
      },
      paint: {
        "text-color": "#e2f7ff",
        "text-halo-color": "#020617",
        "text-halo-width": 1.4,
      },
    });
  }

  if (!map.getLayer("iris-satellite-labels")) {
    map.addLayer({
      id: "iris-satellite-labels",
      source: SATELLITE_SOURCE_ID,
      type: "symbol",
      minzoom: 4,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-offset": [0, 1.05],
        "text-anchor": "top",
      },
      paint: {
        "text-color": "#d1fae5",
        "text-halo-color": "#020617",
        "text-halo-width": 1.4,
      },
    });
  }

  if (!map.getLayer("iris-admin-boundaries") && map.getSource("composite")) {
    try {
      map.addLayer({
        id: "iris-admin-boundaries",
        source: "composite",
        "source-layer": "admin",
        type: "line",
        filter: ["==", ["get", "admin_level"], 0],
        paint: {
          "line-color": "#cbd5e1",
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.18, 5, 0.42],
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.4, 5, 0.9],
        },
      });
    } catch {
      // Some Mapbox styles do not expose the admin source layer.
    }
  }
}

export default function MapboxGlobe() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sensorMode = useWorldStore((state) => state.sensorMode);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !MAPBOX_TOKEN) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const initialLayers = useWorldStore.getState().activeLayers;
    const entityById = new Map<string, NonNullable<SelectedEntity>>();
    const entityPositionById = new Map<string, [number, number]>();
    const aircraftTrailById = new Map<string, Array<[number, number]>>();
    const satelliteCatalogById = new Map<string, PropagatedSatellite>();
    const warnedAircraftFailureRef = { current: false };
    const warnedSatelliteFailureRef = { current: false };
    const warnedEarthquakeFailureRef = { current: false };
    const warnedHumanitarianFailureRef = { current: false };
    const warnedImageryFailureRef = { current: false };
    let cancelled = false;
    let userInteracting = false;

    const map = new mapboxgl.Map({
      container,
      style: initialLayers.mapboxSatellite ? SATELLITE_STYLE : DARK_STYLE,
      center: [0, 20],
      zoom: zoomFromCameraHeight(INITIAL_CAMERA_HEIGHT_METERS),
      projection: "globe",
      attributionControl: false,
      antialias: false,
      fadeDuration: 0,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    const syncLayerVisibility = () => {
      const layers = useWorldStore.getState().activeLayers;
      setLayerVisibility(map, "iris-aircraft-points", layers.aircraft);
      setLayerVisibility(map, "iris-asset-labels", layers.aircraft);
      setLayerVisibility(map, "iris-aircraft-trail", layers.aircraft);
      setLayerVisibility(map, "iris-satellite-points", layers.satellites);
      setLayerVisibility(map, "iris-satellite-labels", layers.satellites);
      setLayerVisibility(map, "iris-satellite-trail", layers.satellites);
      setLayerVisibility(map, "iris-earthquake-points", layers.earthquakes);
      setLayerVisibility(map, "iris-maritime-density", layers.maritime);
      setLayerVisibility(map, "iris-gdelt-points", layers.gdelt);
      setLayerVisibility(map, "iris-humanitarian-points", layers.humanitarian);
      setLayerVisibility(map, "iris-admin-boundaries", layers.boundaries);
      setLayerVisibility(map, "iris-imagery-footprints", layers.imagery);
      setLayerVisibility(map, "iris-imagery-outlines", layers.imagery);
    };

    const updateTelemetry = () => {
      const center = map.getCenter();
      const cameraHeightMeters = cameraHeightFromZoom(map);
      useWorldStore.getState().updateGlobeSettings({
        cameraHeightMeters,
        zoomLevel: Math.round(map.getZoom() * 10) / 10,
        coordinates: {
          latitude: center.lat,
          longitude: center.lng,
          altitudeMeters: cameraHeightMeters,
        },
      });
    };

    const centerFollowedEntity = (instant = false) => {
      const { followEnabled, selectedEntity } = useWorldStore.getState();

      if (!followEnabled || !selectedEntity || userInteracting) {
        return;
      }

      const coordinates = entityPositionById.get(entityKeyForSelection(selectedEntity));
      if (!coordinates) {
        return;
      }

      map.easeTo({
        center: coordinates,
        zoom: Math.max(map.getZoom(), selectedEntity.kind === "satellite" ? 3.1 : 4.6),
        duration: instant ? 0 : 900,
        essential: true,
      });
    };

    const redrawAircraftTrail = () => {
      const selectedAircraftId = selectedEntityIdForKind("aircraft")?.toLowerCase();
      const coordinates = selectedAircraftId
        ? aircraftTrailById.get(createAircraftEntityId(selectedAircraftId)) ?? []
        : [];
      setSourceData(map, AIRCRAFT_TRAIL_SOURCE_ID, lineCollection(coordinates));
    };

    const redrawSatelliteTrail = () => {
      const selectedSatelliteId = selectedEntityIdForKind("satellite");
      const satellite = selectedSatelliteId ? satelliteCatalogById.get(selectedSatelliteId) : null;

      if (!satellite) {
        setSourceData(map, SATELLITE_TRAIL_SOURCE_ID, emptyLine());
        return;
      }

      const now = Date.now();
      const coordinates = Array.from({ length: 17 }, (_, index) => {
        const offsetSeconds = (index - 8) * 90;
        const position = propagateSatellitePosition(satellite, new Date(now + offsetSeconds * 1000));

        return position ? ([position.longitude, position.latitude] satisfies [number, number]) : null;
      }).filter((position): position is [number, number] => position !== null);
      setSourceData(map, SATELLITE_TRAIL_SOURCE_ID, lineCollection(coordinates));
    };

    const updateAircraft = async () => {
      if (cancelled || !useWorldStore.getState().activeLayers.aircraft) {
        return;
      }

      try {
        const startedAt = performance.now();
        const aircraftStates = selectAircraftForRender(await fetchWithBackoff(fetchAircraftStates));
        const completedAt = performance.now();
        const features: Array<Feature<Point, PointProperties>> = [];

        aircraftStates.forEach((aircraft) => {
          const entityId = createAircraftEntityId(aircraft.icao24);
          const entity = {
            id: aircraft.icao24.toUpperCase(),
            name: formatAircraftName(aircraft),
            kind: "aircraft" as const,
            metadata: toAircraftEntityMetadata(aircraft),
          };
          const coordinates: [number, number] = [aircraft.longitude, aircraft.latitude];
          const history = aircraftTrailById.get(entityId) ?? [];
          history.push(coordinates);
          aircraftTrailById.set(entityId, history.slice(-24));
          entityById.set(entityId, entity);
          entityPositionById.set(entityId, coordinates);
          features.push(createPointFeature(
            entityId,
            entity,
            coordinates,
            getAircraftVisualColor(getAircraftVisualState(aircraft)),
            "aircraft",
            aircraft.headingDegrees ?? 0,
          ));
        });

        if (cancelled) {
          return;
        }

        setSourceData(map, AIRCRAFT_SOURCE_ID, pointCollection(features));
        redrawAircraftTrail();
        centerFollowedEntity();
        warnedAircraftFailureRef.current = false;
        useWorldStore.getState().updateFeedStatus("aircraft", {
          online: true,
          count: aircraftStates.length,
          latencyMs: Math.round(completedAt - startedAt),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        useWorldStore.getState().updateFeedStatus("aircraft", { online: false });
        warnFeedFailureOnce("OpenSky aircraft", error, warnedAircraftFailureRef);
      }
    };

    const updateSatellites = async () => {
      if (cancelled || !useWorldStore.getState().activeLayers.satellites) {
        return;
      }

      try {
        const startedAt = performance.now();
        const tles = await fetchWithBackoff(() => fetchActiveSatelliteTles(MAX_RENDERED_SATELLITES));
        const timestamp = Date.now();
        const features: Array<Feature<Point, PointProperties>> = [];

        tles
          .map(createPropagatedSatellite)
          .filter((satellite): satellite is PropagatedSatellite => satellite !== null)
          .forEach((satellite) => {
            const position: SatellitePosition | null = propagateSatellitePosition(satellite, new Date(timestamp));
            if (!position) {
              return;
            }

            const entityId = createSatelliteEntityId(satellite.noradId);
            const entity = {
              id: satellite.noradId,
              name: satellite.name,
              kind: "satellite" as const,
              metadata: toSatelliteEntityMetadata(satellite, position),
            };
            satelliteCatalogById.set(satellite.noradId, satellite);
            entityById.set(entityId, entity);
            entityPositionById.set(entityId, [position.longitude, position.latitude]);
            features.push(createPointFeature(
              entityId,
              entity,
              [position.longitude, position.latitude],
              position.altitudeKm < 2_000 ? "#a7f3d0" : "#6ee7b7",
              "satellite",
            ));
          });

        if (cancelled) {
          return;
        }

        const completedAt = performance.now();
        setSourceData(map, SATELLITE_SOURCE_ID, pointCollection(features));
        redrawSatelliteTrail();
        centerFollowedEntity();
        warnedSatelliteFailureRef.current = false;
        useWorldStore.getState().updateFeedStatus("satellites", {
          online: true,
          count: features.length,
          latencyMs: Math.round(completedAt - startedAt),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        useWorldStore.getState().updateFeedStatus("satellites", { online: false });
        warnFeedFailureOnce("CelesTrak satellite", error, warnedSatelliteFailureRef);
      }
    };

    const updateGdelt = async () => {
      if (cancelled || !useWorldStore.getState().activeLayers.gdelt) {
        return;
      }

      const startedAt = performance.now();
      const events = await fetchGdeltEvents(MAX_GDELT_EVENTS);
      const features = events.map((event) => {
        const entity = {
          id: event.entityId,
          name: getEventLabel(event),
          kind: "gdelt" as const,
          metadata: formatGdeltEvent(event),
        };
        entityById.set(event.entityId, entity);
        entityPositionById.set(event.entityId, [event.lon, event.lat]);

        return createPointFeature(
          event.entityId,
          entity,
          [event.lon, event.lat],
          getEventColor(event.eventBaseCode),
          "gdelt",
        );
      });
      const completedAt = performance.now();

      setSourceData(map, GDELT_SOURCE_ID, pointCollection(features));
      centerFollowedEntity();
      useWorldStore.getState().updateFeedStatus("gdelt", {
        online: events.length > 0,
        count: events.length,
        latencyMs: Math.round(completedAt - startedAt),
        updatedAt: new Date().toISOString(),
      });
    };

    const updateEarthquakes = async () => {
      if (cancelled || !useWorldStore.getState().activeLayers.earthquakes) {
        return;
      }

      try {
        const startedAt = performance.now();
        const events = await fetchEarthquakeEvents(MAX_EARTHQUAKES);
        const features = events.map((event) => {
          const entityId = `earthquake:${event.id}`;
          const entity = {
            id: event.id,
            name: event.title,
            kind: "earthquake" as const,
            metadata: formatEarthquakeEvent(event),
          };
          entityById.set(entityId, entity);
          entityPositionById.set(entityId, [event.longitude, event.latitude]);

          const magnitude = event.magnitude ?? 0;

          return createPointFeature(
            entityId,
            entity,
            [event.longitude, event.latitude],
            magnitude >= 5 ? "#f97316" : "#facc15",
            "earthquake",
          );
        });
        const completedAt = performance.now();

        setSourceData(map, EARTHQUAKE_SOURCE_ID, pointCollection(features));
        useWorldStore.getState().updateFeedStatus("earthquakes", {
          online: events.length > 0,
          count: events.length,
          latencyMs: Math.round(completedAt - startedAt),
          updatedAt: new Date().toISOString(),
        });
        warnedEarthquakeFailureRef.current = false;
      } catch (error) {
        useWorldStore.getState().updateFeedStatus("earthquakes", { online: false });
        warnFeedFailureOnce("USGS earthquakes", error, warnedEarthquakeFailureRef);
      }
    };

    const updateHumanitarian = async () => {
      if (cancelled || !useWorldStore.getState().activeLayers.humanitarian) {
        return;
      }

      try {
        const startedAt = performance.now();
        const reports = await fetchHumanitarianReports(MAX_HUMANITARIAN_REPORTS);
        const features = reports.map((report) => {
          const entityId = `humanitarian:${report.id}`;
          const entity = {
            id: report.id,
            name: report.title,
            kind: "humanitarian" as const,
            metadata: formatHumanitarianReport(report),
          };
          entityById.set(entityId, entity);
          entityPositionById.set(entityId, [report.longitude, report.latitude]);

          return createPointFeature(
            entityId,
            entity,
            [report.longitude, report.latitude],
            "#fb7185",
            "humanitarian",
          );
        });
        const completedAt = performance.now();

        setSourceData(map, HUMANITARIAN_SOURCE_ID, pointCollection(features));
        useWorldStore.getState().updateFeedStatus("humanitarian", {
          online: reports.length > 0,
          count: reports.length,
          latencyMs: Math.round(completedAt - startedAt),
          updatedAt: new Date().toISOString(),
        });
        warnedHumanitarianFailureRef.current = false;
      } catch (error) {
        useWorldStore.getState().updateFeedStatus("humanitarian", { online: false });
        warnFeedFailureOnce("ReliefWeb humanitarian", error, warnedHumanitarianFailureRef);
      }
    };

    const updateImagery = async () => {
      if (cancelled || !useWorldStore.getState().activeLayers.imagery) {
        return;
      }

      try {
        const startedAt = performance.now();
        const footprints = await fetchImageryFootprints(MAX_IMAGERY_FOOTPRINTS);
        const features = footprints.map((footprint): Feature<Polygon, PointProperties> => {
          const entityId = `imagery:${footprint.id}`;
          const entity = {
            id: footprint.id,
            name: footprint.title,
            kind: "imagery" as const,
            metadata: formatImageryFootprint(footprint),
          };
          entityById.set(entityId, entity);

          return {
            type: "Feature",
            id: entityId,
            properties: {
              entityId,
              label: entity.name,
              kind: entity.kind,
              color: "#fbbf24",
              icon: dataSourceIconId.gdelt,
              rotation: 0,
            },
            geometry: footprint.geometry,
          };
        });
        const completedAt = performance.now();

        setSourceData(map, IMAGERY_SOURCE_ID, polygonCollection(features));
        useWorldStore.getState().updateFeedStatus("imagery", {
          online: footprints.length > 0,
          count: footprints.length,
          latencyMs: Math.round(completedAt - startedAt),
          updatedAt: new Date().toISOString(),
        });
        warnedImageryFailureRef.current = false;
      } catch (error) {
        useWorldStore.getState().updateFeedStatus("imagery", { online: false });
        warnFeedFailureOnce("NASA CMR imagery", error, warnedImageryFailureRef);
      }
    };

    const refreshAll = () => {
      void updateAircraft();
      void updateSatellites();
      void updateEarthquakes();
      void updateGdelt();
      void updateHumanitarian();
      void updateImagery();
    };

    const handlePointerFeature = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const entityId = feature?.properties?.entityId as string | undefined;
      const entity = entityId ? entityById.get(entityId) : null;

      map.getCanvas().style.cursor = entity ? "pointer" : "";
      useWorldStore.getState().setHoveredEntity(
        entity ?? null,
        entity ? { x: event.point.x, y: event.point.y } : null,
      );
    };

    const handleClickFeature = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const entityId = feature?.properties?.entityId as string | undefined;
      const entity = entityId ? entityById.get(entityId) : null;

      if (!entity) {
        return;
      }

      useWorldStore.getState().setSelectedEntity(entity);
      useWorldStore.getState().setFollowEnabled(true);
      redrawAircraftTrail();
      redrawSatelliteTrail();
      centerFollowedEntity();
    };

    const clearHover = () => {
      map.getCanvas().style.cursor = "";
      useWorldStore.getState().setHoveredEntity(null, null);
    };

    map.on("style.load", () => {
      map.setProjection("globe");
      map.setFog({
        color: "rgb(2, 7, 10)",
        "high-color": "rgb(10, 35, 52)",
        "horizon-blend": 0.08,
        "space-color": "rgb(1, 4, 9)",
        "star-intensity": 0.18,
      });
      ensureMapLayers(map);
      syncLayerVisibility();
      refreshAll();
    });
    map.on("move", updateTelemetry);
    map.on("dragstart", () => {
      userInteracting = true;
    });
    map.on("zoomstart", () => {
      userInteracting = true;
    });
    map.on("moveend", () => {
      userInteracting = false;
      updateTelemetry();
    });

    const registerInteractiveLayers = () => {
      const interactiveLayers = [
        "iris-aircraft-points",
        "iris-satellite-points",
        "iris-earthquake-points",
        "iris-gdelt-points",
        "iris-humanitarian-points",
        "iris-imagery-footprints",
      ];
      interactiveLayers.forEach((layerId) => {
        map.on("mousemove", layerId, handlePointerFeature);
        map.on("click", layerId, handleClickFeature);
        map.on("mouseleave", layerId, clearHover);
      });
    };

    const unsubscribeLayers = useWorldStore.subscribe((state, previousState) => {
      if (state.activeLayers.mapboxSatellite !== previousState.activeLayers.mapboxSatellite) {
        map.setStyle(state.activeLayers.mapboxSatellite ? SATELLITE_STYLE : DARK_STYLE);
        return;
      }

      if (state.activeLayers !== previousState.activeLayers) {
        syncLayerVisibility();
        refreshAll();
      }
    });
    const unsubscribeSelection = useWorldStore.subscribe((state, previousState) => {
      if (state.selectedEntity === previousState.selectedEntity) {
        return;
      }

      redrawAircraftTrail();
      redrawSatelliteTrail();
      centerFollowedEntity(true);
    });
    const aircraftInterval = window.setInterval(updateAircraft, AIRCRAFT_REFRESH_INTERVAL_MS);
    const satelliteInterval = window.setInterval(updateSatellites, SATELLITE_UPDATE_INTERVAL_MS);
    const gdeltInterval = window.setInterval(updateGdelt, GDELT_INTERVAL_MS);
    const earthquakeInterval = window.setInterval(updateEarthquakes, EARTHQUAKE_INTERVAL_MS);
    const humanitarianInterval = window.setInterval(updateHumanitarian, HUMANITARIAN_INTERVAL_MS);
    const imageryInterval = window.setInterval(updateImagery, IMAGERY_INTERVAL_MS);

    map.once("load", () => {
      ensureMapLayers(map);
      registerInteractiveLayers();
      syncLayerVisibility();
      updateTelemetry();
      refreshAll();
    });

    return () => {
      cancelled = true;
      unsubscribeLayers();
      unsubscribeSelection();
      window.clearInterval(aircraftInterval);
      window.clearInterval(satelliteInterval);
      window.clearInterval(gdeltInterval);
      window.clearInterval(earthquakeInterval);
      window.clearInterval(humanitarianInterval);
      window.clearInterval(imageryInterval);
      useWorldStore.getState().setHoveredEntity(null, null);
      map.remove();
    };
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#02070a] text-sm text-slate-300">
        Missing Mapbox token
      </div>
    );
  }

  return (
    <div className={`sensor-mode sensor-mode-${sensorMode} fixed inset-0 h-screen w-screen bg-[#02070a]`}>
      <div ref={containerRef} className="h-full w-full" />
      <div className="sensor-overlay pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="sensor-reticle pointer-events-none absolute left-1/2 top-1/2 z-10 size-20 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
    </div>
  );
}
