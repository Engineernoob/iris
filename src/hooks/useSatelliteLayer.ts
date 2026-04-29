"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  Cartesian2,
  Cartesian3,
  CallbackProperty,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
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
} from "@/lib/cesiumEntityUtils";
import { fetchWithBackoff, warnFeedFailureOnce } from "@/lib/feedRetry";
import type { PropagatedSatellite, SatellitePosition } from "@/lib/satellitePropagation";
import {
  createPropagatedSatellite,
  propagateSatellitePosition,
} from "@/lib/satellitePropagation";
import { useWorldStore } from "@/store/useWorldStore";

const SATELLITE_PULSE_INTERVAL_MS = 1000 / 6;

type TrackedSatellite = {
  satellite: PropagatedSatellite;
  position: SatellitePosition;
};

type SatelliteRefs = {
  entityIds: Set<string>;
  entityById: Map<string, import("cesium").Entity>;
  satelliteByEntityId: Map<string, TrackedSatellite>;
  positionByEntityId: Map<string, ConstantPositionProperty>;
  labelVisibilityByEntityId: Map<string, ConstantProperty>;
  positionCacheByEntityId: Map<string, { bucket: number; position: SatellitePosition }>;
};

function shouldShowLabels(viewer: Viewer, moving: boolean): boolean {
  return !moving && viewer.camera.positionCartographic.height < SATELLITE_LABEL_HEIGHT_THRESHOLD;
}

const SATELLITE_COLOR_LOW = Color.fromCssColorString("#a7f3d0");
const SATELLITE_COLOR_HIGH = SATELLITE_COLOR_LOW.withAlpha(0.56);
const SATELLITE_COLOR_LOW_ALPHA = SATELLITE_COLOR_LOW.withAlpha(0.94);
const SATELLITE_OUTLINE_LOW = Color.fromCssColorString("#ecfeff");
const SATELLITE_OUTLINE_HIGH = SATELLITE_OUTLINE_LOW.withAlpha(0.36);
const SATELLITE_OUTLINE_LOW_ALPHA = SATELLITE_OUTLINE_LOW.withAlpha(0.72);
const SATELLITE_LABEL_FILL = SATELLITE_OUTLINE_LOW.withAlpha(0.9);
const SATELLITE_LABEL_OUTLINE = Color.fromCssColorString("#020617").withAlpha(0.92);

function satelliteColor(position: SatellitePosition): Color {
  return position.altitudeKm < 2_000 ? SATELLITE_COLOR_LOW_ALPHA : SATELLITE_COLOR_HIGH;
}

function satelliteOutlineColor(position: SatellitePosition): Color {
  return position.altitudeKm < 2_000 ? SATELLITE_OUTLINE_LOW_ALPHA : SATELLITE_OUTLINE_HIGH;
}

function satellitePulseSize(position: SatellitePosition, phaseSeed: number): CallbackProperty {
  const baseSize = position.altitudeKm < 2_000 ? 5.6 : 4.2;

  return new CallbackProperty(() => {
    const pulse = (Math.sin(Date.now() / 520 + phaseSeed) + 1) * 0.5;

    return baseSize + pulse * 2.1;
  }, false);
}

function syncSatelliteLabels(viewer: Viewer, refs: SatelliteRefs, moving: boolean) {
  const selectedNoradId = selectedEntityIdForKind("satellite");
  const closeEnough = shouldShowLabels(viewer, moving);
  const showPredicate = (entityId: string) => {
    if (moving) {
      return false;
    }
    return closeEnough || entityId === createSatelliteEntityId(selectedNoradId ?? "");
  };

  refs.entityById.forEach((entity, entityId) => {
    refs.labelVisibilityByEntityId.get(entityId)?.setValue(showPredicate(entityId));
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
    entityById: new Map(),
    satelliteByEntityId: new Map(),
    positionByEntityId: new Map(),
    labelVisibilityByEntityId: new Map(),
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
      refs.entityById.clear();
      refs.satelliteByEntityId.clear();
      refs.positionByEntityId.clear();
      refs.labelVisibilityByEntityId.clear();
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
        const startedAt = performance.now();
        const satellites = await getSatelliteCatalog();
        const completedAt = performance.now();

        if (cancelled || viewer.isDestroyed()) {
          return;
        }

        warnedFailureRef.current = false;
        useWorldStore.getState().updateFeedStatus("satellites", {
          online: true,
          count: satellites.length,
          latencyMs: Math.round(completedAt - startedAt),
          updatedAt: new Date().toISOString(),
        });

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
            const existingEntity = refs.entityById.get(entityId);
            if (existingEntity?.point) {
              existingEntity.point.color = new ConstantProperty(satelliteColor(position));
              existingEntity.point.outlineColor = new ConstantProperty(satelliteOutlineColor(position));
            }
            return;
          }

          const newPositionProperty = new ConstantPositionProperty(cesiumPosition);
          const labelVisibilityProperty = new ConstantProperty(false);
          refs.positionByEntityId.set(entityId, newPositionProperty);
          refs.labelVisibilityByEntityId.set(entityId, labelVisibilityProperty);

          const entity = viewer.entities.add({
            id: entityId,
            name: satellite.name,
            position: newPositionProperty,
            point: {
              pixelSize: satellitePulseSize(position, Number(satellite.noradId) % 9),
              color: satelliteColor(position),
              outlineColor: satelliteOutlineColor(position),
              outlineWidth: 1,
              distanceDisplayCondition: new DistanceDisplayCondition(0, 24_000_000),
              disableDepthTestDistance: 4_000_000,
            },
            label: {
              show: labelVisibilityProperty,
              text: satellite.name,
              font: "500 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fillColor: SATELLITE_LABEL_FILL,
              outlineColor: SATELLITE_LABEL_OUTLINE,
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              horizontalOrigin: HorizontalOrigin.CENTER,
              verticalOrigin: VerticalOrigin.BOTTOM,
              pixelOffset: new Cartesian2(0, -9),
              distanceDisplayCondition: new DistanceDisplayCondition(0, SATELLITE_LABEL_HEIGHT_THRESHOLD),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          refs.entityById.set(entityId, entity);
        });

        refs.entityIds.forEach((entityId) => {
          if (!liveEntityIds.has(entityId)) {
            viewer.entities.removeById(entityId);
            refs.entityById.delete(entityId);
            refs.satelliteByEntityId.delete(entityId);
            refs.positionByEntityId.delete(entityId);
            refs.labelVisibilityByEntityId.delete(entityId);
            refs.positionCacheByEntityId.delete(entityId);
          }
        });

        refs.entityIds = liveEntityIds;
        syncSatelliteLabels(viewer, refs, movingRef.current);
        viewer.scene.requestRender();
      } catch (error) {
        useWorldStore.getState().updateFeedStatus("satellites", {
          online: false,
        });
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
    const pulseInterval = window.setInterval(() => {
      if (refs.entityIds.size > 0 && !movingRef.current) {
        viewer.scene.requestRender();
      }
    }, SATELLITE_PULSE_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(updateInterval);
      window.clearInterval(pulseInterval);
      removeMoveStart();
      removeMoveEnd();
      unsubscribeSelection();
      clickHandler.destroy();
      removeSatelliteEntities();
    };
  }, [active, ready, viewerRef]);
}
