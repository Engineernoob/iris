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
import { fetchWithBackoff, warnFeedFailureOnce } from "@/lib/feedRetry";
import { fetchGdeltEvents, formatGdeltEvent, getEventColor, getEventLabel } from "@/lib/gdelt";
import type { AircraftState } from "@/lib/opensky";
import { fetchAircraftStates } from "@/lib/opensky";
import type { PropagatedSatellite, SatellitePosition } from "@/lib/satellitePropagation";
import {
  createPropagatedSatellite,
  propagateSatellitePosition,
} from "@/lib/satellitePropagation";
import { useWorldStore, type SelectedEntity } from "@/store/useWorldStore";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const AIRCRAFT_SOURCE_ID = "iris-aircraft";
const SATELLITE_SOURCE_ID = "iris-satellites";
const GDELT_SOURCE_ID = "iris-gdelt";
const AIRCRAFT_TRAIL_SOURCE_ID = "iris-aircraft-trail";
const SATELLITE_TRAIL_SOURCE_ID = "iris-satellite-trail";
const GDELT_INTERVAL_MS = 60_000;
const MAX_GDELT_EVENTS = 50;
const AIRCRAFT_REFRESH_INTERVAL_MS = 30_000;
const INITIAL_CAMERA_HEIGHT_METERS = 5_000_000;
const MAX_RENDERED_AIRCRAFT = 80;
const MAX_RENDERED_SATELLITES = 30;
const SATELLITE_UPDATE_INTERVAL_MS = 15_000;
const EMPTY_POINTS: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };
const EMPTY_LINE: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };

type PointProperties = {
  entityId: string;
  label: string;
  color: string;
  kind: NonNullable<SelectedEntity>["kind"];
};

function selectedEntityIdForKind(kind: "aircraft" | "satellite"): string | null {
  const selectedEntity = useWorldStore.getState().selectedEntity;

  if (selectedEntity?.kind !== kind) {
    return null;
  }

  return selectedEntity.id;
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
  addGeoJsonSource(map, AIRCRAFT_SOURCE_ID, EMPTY_POINTS);
  addGeoJsonSource(map, SATELLITE_SOURCE_ID, EMPTY_POINTS);
  addGeoJsonSource(map, GDELT_SOURCE_ID, EMPTY_POINTS);
  addGeoJsonSource(map, AIRCRAFT_TRAIL_SOURCE_ID, EMPTY_LINE);
  addGeoJsonSource(map, SATELLITE_TRAIL_SOURCE_ID, EMPTY_LINE);

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
      type: "circle",
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 2.5, 5, 5, 10, 8],
        "circle-opacity": 0.8,
        "circle-stroke-color": "#f8fafc",
        "circle-stroke-opacity": 0.45,
        "circle-stroke-width": 1,
      },
    });
  }

  if (!map.getLayer("iris-satellite-points")) {
    map.addLayer({
      id: "iris-satellite-points",
      source: SATELLITE_SOURCE_ID,
      type: "circle",
      paint: {
        "circle-color": "#a7f3d0",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 2.2, 5, 4, 10, 7],
        "circle-opacity": 0.9,
        "circle-stroke-color": "#ecfeff",
        "circle-stroke-opacity": 0.65,
        "circle-stroke-width": 1,
      },
    });
  }

  if (!map.getLayer("iris-aircraft-points")) {
    map.addLayer({
      id: "iris-aircraft-points",
      source: AIRCRAFT_SOURCE_ID,
      type: "circle",
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 2.5, 5, 4.5, 10, 7],
        "circle-opacity": 0.92,
        "circle-stroke-color": "#ecfeff",
        "circle-stroke-opacity": 0.65,
        "circle-stroke-width": 1,
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
}

export default function MapboxGlobe() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !MAPBOX_TOKEN) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const initialLayers = useWorldStore.getState().activeLayers;
    const entityById = new Map<string, NonNullable<SelectedEntity>>();
    const aircraftTrailById = new Map<string, Array<[number, number]>>();
    const satelliteCatalogById = new Map<string, PropagatedSatellite>();
    const warnedAircraftFailureRef = { current: false };
    const warnedSatelliteFailureRef = { current: false };
    let cancelled = false;
    let userInteracting = false;
    let animationFrameId: number | null = null;

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
      setLayerVisibility(map, "iris-gdelt-points", layers.gdelt);
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
          features.push(createPointFeature(
            entityId,
            entity,
            coordinates,
            getAircraftVisualColor(getAircraftVisualState(aircraft)),
          ));
        });

        if (cancelled) {
          return;
        }

        setSourceData(map, AIRCRAFT_SOURCE_ID, pointCollection(features));
        redrawAircraftTrail();
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
            features.push(createPointFeature(
              entityId,
              entity,
              [position.longitude, position.latitude],
              position.altitudeKm < 2_000 ? "#a7f3d0" : "#6ee7b7",
            ));
          });

        if (cancelled) {
          return;
        }

        const completedAt = performance.now();
        setSourceData(map, SATELLITE_SOURCE_ID, pointCollection(features));
        redrawSatelliteTrail();
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

        return createPointFeature(
          event.entityId,
          entity,
          [event.lon, event.lat],
          getEventColor(event.eventBaseCode),
        );
      });
      const completedAt = performance.now();

      setSourceData(map, GDELT_SOURCE_ID, pointCollection(features));
      useWorldStore.getState().updateFeedStatus("gdelt", {
        online: events.length > 0,
        count: events.length,
        latencyMs: Math.round(completedAt - startedAt),
        updatedAt: new Date().toISOString(),
      });
    };

    const refreshAll = () => {
      void updateAircraft();
      void updateSatellites();
      void updateGdelt();
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
      redrawAircraftTrail();
      redrawSatelliteTrail();
    };

    const clearHover = () => {
      map.getCanvas().style.cursor = "";
      useWorldStore.getState().setHoveredEntity(null, null);
    };

    const startAutoRotate = () => {
      let previous = performance.now();
      const tick = (now: number) => {
        if (!cancelled && useWorldStore.getState().activeLayers.hud && !userInteracting && !map.isMoving()) {
          const elapsedSeconds = Math.min((now - previous) / 1000, 0.2);
          const center = map.getCenter();
          map.setCenter([center.lng - elapsedSeconds * 0.35, center.lat]);
        }
        previous = now;
        animationFrameId = window.requestAnimationFrame(tick);
      };

      animationFrameId = window.requestAnimationFrame(tick);
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
      const interactiveLayers = ["iris-aircraft-points", "iris-satellite-points", "iris-gdelt-points"];
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
    });
    const aircraftInterval = window.setInterval(updateAircraft, AIRCRAFT_REFRESH_INTERVAL_MS);
    const satelliteInterval = window.setInterval(updateSatellites, SATELLITE_UPDATE_INTERVAL_MS);
    const gdeltInterval = window.setInterval(updateGdelt, GDELT_INTERVAL_MS);

    map.once("load", () => {
      ensureMapLayers(map);
      registerInteractiveLayers();
      syncLayerVisibility();
      updateTelemetry();
      refreshAll();
      startAutoRotate();
    });

    return () => {
      cancelled = true;
      unsubscribeLayers();
      unsubscribeSelection();
      window.clearInterval(aircraftInterval);
      window.clearInterval(satelliteInterval);
      window.clearInterval(gdeltInterval);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
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

  return <div ref={containerRef} className="fixed inset-0 h-screen w-screen bg-[#02070a]" />;
}
