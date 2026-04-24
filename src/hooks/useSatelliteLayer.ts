"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantPositionProperty,
  DistanceDisplayCondition,
  HorizontalOrigin,
  LabelStyle,
  PolylineGlowMaterialProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer,
} from "cesium";

import { fetchActiveSatelliteTles } from "@/lib/celestrak";
import {
  MAX_RENDERED_SATELLITES,
  SATELLITE_LABEL_HEIGHT_THRESHOLD,
  SATELLITE_TRAIL_ENTITY_ID,
  SATELLITE_UPDATE_INTERVAL_MS,
} from "@/lib/cesiumConfig";
import {
  createSatelliteEntityId,
  selectedEntityIdForKind,
  toSatelliteEntityMetadata,
  updateEntityLabels,
} from "@/lib/cesiumEntityUtils";
import { fetchWithBackoff, warnFeedFailureOnce } from "@/lib/feedRetry";
import type { PropagatedSatellite, SatellitePosition } from "@/lib/satellitePropagation";
import {
  createPropagatedSatellite,
  propagateSatellitePosition,
} from "@/lib/satellitePropagation";
import { useWorldStore } from "@/store/useWorldStore";

type TrackedSatellite = {
  satellite: PropagatedSatellite;
  position: SatellitePosition;
};

type SatelliteRefs = {
  entityIds: Set<string>;
  satelliteByEntityId: Map<string, TrackedSatellite>;
  positionByEntityId: Map<string, ConstantPositionProperty>;
  positionCacheByEntityId: Map<string, { bucket: number; position: SatellitePosition }>;
};

function shouldShowLabels(viewer: Viewer, moving: boolean): boolean {
  return !moving && viewer.camera.positionCartographic.height < SATELLITE_LABEL_HEIGHT_THRESHOLD;
}

function syncSatelliteLabels(viewer: Viewer, refs: SatelliteRefs, moving: boolean) {
  const selectedNoradId = selectedEntityIdForKind("satellite");
  const closeEnough = shouldShowLabels(viewer, moving);

  updateEntityLabels(viewer, refs.entityIds, (entityId) => {
    if (moving) {
      return false;
    }

    return closeEnough || entityId === createSatelliteEntityId(selectedNoradId ?? "");
  });
}

function getCachedSatellitePosition(
  refs: SatelliteRefs,
  satellite: PropagatedSatellite,
  timestamp: number,
): SatellitePosition | null {
  const entityId = createSatelliteEntityId(satellite.noradId);
  const bucket = Math.floor(timestamp / SATELLITE_UPDATE_INTERVAL_MS);
  const cached = refs.positionCacheByEntityId.get(entityId);

  if (cached?.bucket === bucket) {
    return cached.position;
  }

  const position = propagateSatellitePosition(satellite, new Date(timestamp));

  if (position) {
    refs.positionCacheByEntityId.set(entityId, { bucket, position });
  }

  return position;
}

export function useSatelliteLayer(viewerRef: RefObject<Viewer | null>, ready: boolean) {
  const active = useWorldStore((state) => state.activeLayers.satellites);
  const refsRef = useRef<SatelliteRefs>({
    entityIds: new Set(),
    satelliteByEntityId: new Map(),
    positionByEntityId: new Map(),
    positionCacheByEntityId: new Map(),
  });
  const satelliteCatalogRef = useRef<PropagatedSatellite[] | null>(null);
  const movingRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const warnedFailureRef = useRef(false);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!ready || !viewer) {
      return;
    }

    const refs = refsRef.current;

    const removeSatelliteEntities = () => {
      refs.entityIds.forEach((entityId) => {
        viewer.entities.removeById(entityId);
      });
      viewer.entities.removeById(SATELLITE_TRAIL_ENTITY_ID);
      refs.entityIds.clear();
      refs.satelliteByEntityId.clear();
      refs.positionByEntityId.clear();
      refs.positionCacheByEntityId.clear();

      const { selectedEntity, setSelectedEntity } = useWorldStore.getState();
      if (selectedEntity?.kind === "satellite") {
        setSelectedEntity(null);
      }
    };

    if (!active) {
      removeSatelliteEntities();
      viewer.scene.requestRender();
      return;
    }

    let cancelled = false;

    const getSatelliteCatalog = async () => {
      if (satelliteCatalogRef.current) {
        return satelliteCatalogRef.current;
      }

      const tles = await fetchWithBackoff(() =>
        fetchActiveSatelliteTles(MAX_RENDERED_SATELLITES),
      );
      const satellites = tles
        .map(createPropagatedSatellite)
        .filter((satellite): satellite is PropagatedSatellite => satellite !== null)
        .slice(0, MAX_RENDERED_SATELLITES);

      satelliteCatalogRef.current = satellites;

      return satellites;
    };

    const drawSelectedSatelliteTrail = (satellite: PropagatedSatellite) => {
      viewer.entities.removeById(SATELLITE_TRAIL_ENTITY_ID);

      const now = Date.now();
      const positions = Array.from({ length: 17 }, (_, index) => {
        const offsetSeconds = (index - 8) * 90;
        const position = propagateSatellitePosition(satellite, new Date(now + offsetSeconds * 1000));

        if (!position) {
          return null;
        }

        return Cartesian3.fromDegrees(
          position.longitude,
          position.latitude,
          position.altitudeKm * 1000,
        );
      }).filter((position): position is Cartesian3 => position !== null);

      if (positions.length < 2) {
        return;
      }

      viewer.entities.add({
        id: SATELLITE_TRAIL_ENTITY_ID,
        polyline: {
          positions,
          width: 1.5,
          material: new PolylineGlowMaterialProperty({
            color: Color.fromCssColorString("#a7f3d0").withAlpha(0.58),
            glowPower: 0.18,
          }),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 12_000_000),
        },
      });
    };

    const updateSatelliteEntities = async () => {
      if (requestInFlightRef.current) {
        return;
      }

      requestInFlightRef.current = true;

      try {
        const satellites = await getSatelliteCatalog();

        if (cancelled || viewer.isDestroyed()) {
          return;
        }

        warnedFailureRef.current = false;

        const liveEntityIds = new Set<string>();
        const timestamp = Date.now();

        satellites.forEach((satellite) => {
          const position = getCachedSatellitePosition(refs, satellite, timestamp);

          if (!position) {
            return;
          }

          const entityId = createSatelliteEntityId(satellite.noradId);
          const cesiumPosition = Cartesian3.fromDegrees(
            position.longitude,
            position.latitude,
            position.altitudeKm * 1000,
          );
          const positionProperty = refs.positionByEntityId.get(entityId);

          liveEntityIds.add(entityId);
          refs.entityIds.add(entityId);
          refs.satelliteByEntityId.set(entityId, { satellite, position });

          if (positionProperty) {
            positionProperty.setValue(cesiumPosition);
            return;
          }

          const newPositionProperty = new ConstantPositionProperty(cesiumPosition);
          refs.positionByEntityId.set(entityId, newPositionProperty);

          viewer.entities.add({
            id: entityId,
            name: satellite.name,
            position: newPositionProperty,
            point: {
              pixelSize: 5,
              color: Color.fromCssColorString("#a7f3d0").withAlpha(0.9),
              outlineColor: Color.fromCssColorString("#ecfeff").withAlpha(0.55),
              outlineWidth: 1,
              distanceDisplayCondition: new DistanceDisplayCondition(0, 24_000_000),
              disableDepthTestDistance: 4_000_000,
            },
            label: {
              show: false,
              text: satellite.name,
              font: "500 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fillColor: Color.fromCssColorString("#ecfeff").withAlpha(0.9),
              outlineColor: Color.fromCssColorString("#020617").withAlpha(0.92),
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              horizontalOrigin: HorizontalOrigin.CENTER,
              verticalOrigin: VerticalOrigin.BOTTOM,
              pixelOffset: new Cartesian2(0, -9),
              distanceDisplayCondition: new DistanceDisplayCondition(0, SATELLITE_LABEL_HEIGHT_THRESHOLD),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });

        refs.entityIds.forEach((entityId) => {
          if (!liveEntityIds.has(entityId)) {
            viewer.entities.removeById(entityId);
            refs.satelliteByEntityId.delete(entityId);
            refs.positionByEntityId.delete(entityId);
            refs.positionCacheByEntityId.delete(entityId);
          }
        });

        refs.entityIds = liveEntityIds;
        syncSatelliteLabels(viewer, refs, movingRef.current);
        viewer.scene.requestRender();
      } catch (error) {
        warnFeedFailureOnce("CelesTrak satellite", error, warnedFailureRef);
      } finally {
        requestInFlightRef.current = false;
      }
    };

    const clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(movement.position) as { id?: { id?: string } } | undefined;
      const pickedId = picked?.id?.id;

      if (!pickedId?.startsWith("satellite:")) {
        return;
      }

      const trackedSatellite = refs.satelliteByEntityId.get(pickedId);
      if (!trackedSatellite) {
        return;
      }

      useWorldStore.getState().setSelectedEntity({
        id: trackedSatellite.satellite.noradId,
        name: trackedSatellite.satellite.name,
        kind: "satellite",
        metadata: toSatelliteEntityMetadata(trackedSatellite.satellite, trackedSatellite.position),
      });
      drawSelectedSatelliteTrail(trackedSatellite.satellite);
      syncSatelliteLabels(viewer, refs, movingRef.current);
      viewer.scene.requestRender();
    }, ScreenSpaceEventType.LEFT_CLICK);

    const removeMoveStart = viewer.camera.moveStart.addEventListener(() => {
      movingRef.current = true;
      syncSatelliteLabels(viewer, refs, true);
    });
    const removeMoveEnd = viewer.camera.moveEnd.addEventListener(() => {
      movingRef.current = false;
      syncSatelliteLabels(viewer, refs, false);
      viewer.scene.requestRender();
    });
    const unsubscribeSelection = useWorldStore.subscribe((state, previousState) => {
      if (state.selectedEntity === previousState.selectedEntity) {
        return;
      }

      syncSatelliteLabels(viewer, refs, movingRef.current);
      viewer.scene.requestRender();
    });

    void updateSatelliteEntities();
    const updateInterval = window.setInterval(() => {
      void updateSatelliteEntities();
    }, SATELLITE_UPDATE_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(updateInterval);
      removeMoveStart();
      removeMoveEnd();
      unsubscribeSelection();
      clickHandler.destroy();
      removeSatelliteEntities();
    };
  }, [active, ready, viewerRef]);
}
