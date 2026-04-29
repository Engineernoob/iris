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
  HeightReference,
  HorizontalOrigin,
  LabelStyle,
  Math as CesiumMath,
  PolylineGlowMaterialProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer,
} from "cesium";

import {
  AIRCRAFT_LABEL_HEIGHT_THRESHOLD,
  AIRCRAFT_REFRESH_INTERVAL_MS,
  AIRCRAFT_TRAIL_ENTITY_ID,
  MAX_RENDERED_AIRCRAFT,
  SATELLITE_TRAIL_ENTITY_ID,
} from "@/lib/cesiumConfig";
import {
  createAircraftEntityId,
  formatAircraftName,
  getAircraftIconDataUrl,
  getAircraftVisualState,
  selectedEntityIdForKind,
  toAircraftEntityMetadata,
} from "@/lib/cesiumEntityUtils";
import { fetchWithBackoff, warnFeedFailureOnce } from "@/lib/feedRetry";
import type { AircraftState } from "@/lib/opensky";
import { fetchAircraftStates } from "@/lib/opensky";
import { useWorldStore } from "@/store/useWorldStore";

const AIRCRAFT_ANIMATION_INTERVAL_MS = 1000 / 15;
const AIRCRAFT_TRAIL_MAX_POINTS = 24;
const AIRCRAFT_TRAIL_SAMPLE_MS = 1_200;

const LABEL_FILL_COLOR = Color.fromCssColorString("#dffcff").withAlpha(0.92);
const LABEL_OUTLINE_COLOR = Color.fromCssColorString("#020617").withAlpha(0.9);

type Interpolation = {
  from: Cartesian3;
  to: Cartesian3;
  startedAt: number;
  endsAt: number;
};

type AircraftRefs = {
  entityIds: Set<string>;
  entityById: Map<string, import("cesium").Entity>;
  aircraftByEntityId: Map<string, AircraftState>;
  positionByEntityId: Map<string, ConstantPositionProperty>;
  labelVisibilityByEntityId: Map<string, ConstantProperty>;
  interpolationByEntityId: Map<string, Interpolation>;
  visualStateByEntityId: Map<string, string>;
};

function selectAircraftForRender(aircraftStates: AircraftState[]): AircraftState[] {
  return [...aircraftStates]
    .filter((aircraft) => aircraft.icao24)
    .sort((first, second) => {
      if (first.onGround !== second.onGround) {
        return first.onGround ? 1 : -1;
      }

      return (second.altitudeMeters ?? -1) - (first.altitudeMeters ?? -1);
    })
    .slice(0, MAX_RENDERED_AIRCRAFT);
}

function shouldShowLabels(viewer: Viewer, moving: boolean): boolean {
  return !moving && viewer.camera.positionCartographic.height < AIRCRAFT_LABEL_HEIGHT_THRESHOLD;
}

function syncAircraftLabels(viewer: Viewer, refs: AircraftRefs, moving: boolean) {
  const selectedIcao24 = selectedEntityIdForKind("aircraft")?.toLowerCase() ?? null;
  const closeEnough = shouldShowLabels(viewer, moving);
  const showPredicate = (entityId: string) => {
    if (moving) {
      return false;
    }
    return closeEnough || entityId === createAircraftEntityId(selectedIcao24 ?? "");
  };

  refs.entityById.forEach((entity, entityId) => {
    refs.labelVisibilityByEntityId.get(entityId)?.setValue(showPredicate(entityId));
  });
}

export function useAircraftLayer(viewerRef: RefObject<Viewer | null>, ready: boolean) {
  const active = useWorldStore((state) => state.activeLayers.aircraft);
  const refsRef = useRef<AircraftRefs>({
    entityIds: new Set(),
    entityById: new Map(),
    aircraftByEntityId: new Map(),
    positionByEntityId: new Map(),
    labelVisibilityByEntityId: new Map(),
    interpolationByEntityId: new Map(),
    visualStateByEntityId: new Map(),
  });
  const movingRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const warnedFailureRef = useRef(false);
  const trailPositionsRef = useRef<Cartesian3[]>([]);
  const lastTrailSampleAtRef = useRef(0);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!ready || !viewer) {
      return;
    }

    const refs = refsRef.current;

    const removeAircraftEntities = () => {
      refs.entityIds.forEach((entityId) => {
        viewer.entities.removeById(entityId);
      });
      refs.entityIds.clear();
      refs.entityById.clear();
      refs.aircraftByEntityId.clear();
      refs.positionByEntityId.clear();
      refs.labelVisibilityByEntityId.clear();
      refs.interpolationByEntityId.clear();
      refs.visualStateByEntityId.clear();
      trailPositionsRef.current = [];
      viewer.entities.removeById(AIRCRAFT_TRAIL_ENTITY_ID);

      const { selectedEntity, setSelectedEntity } = useWorldStore.getState();
      if (selectedEntity?.kind === "aircraft") {
        setSelectedEntity(null);
      }
    };

    if (!active) {
      removeAircraftEntities();
      viewer.scene.requestRender();
      return;
    }

    let cancelled = false;

    const ensureAircraftTrail = () => {
      if (viewer.entities.getById(AIRCRAFT_TRAIL_ENTITY_ID)) {
        return;
      }

      viewer.entities.add({
        id: AIRCRAFT_TRAIL_ENTITY_ID,
        polyline: {
          positions: new CallbackProperty(() => trailPositionsRef.current, false),
          width: 1.5,
          material: new PolylineGlowMaterialProperty({
            color: Color.fromCssColorString("#67e8f9").withAlpha(0.46),
            glowPower: 0.16,
          }),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 5_000_000),
        },
      });
    };

    const syncAircraftTrail = (now: number) => {
      const selectedIcao24 = selectedEntityIdForKind("aircraft")?.toLowerCase();

      if (!selectedIcao24) {
        trailPositionsRef.current = [];
        viewer.entities.removeById(AIRCRAFT_TRAIL_ENTITY_ID);
        return;
      }

      const entityId = createAircraftEntityId(selectedIcao24);
      const currentPosition = refs.positionByEntityId.get(entityId)?.getValue(viewer.clock.currentTime);

      if (!currentPosition) {
        return;
      }

      ensureAircraftTrail();

      if (now - lastTrailSampleAtRef.current >= AIRCRAFT_TRAIL_SAMPLE_MS) {
        lastTrailSampleAtRef.current = now;
        trailPositionsRef.current = [
          ...trailPositionsRef.current.slice(-(AIRCRAFT_TRAIL_MAX_POINTS - 1)),
          Cartesian3.clone(currentPosition),
        ];
      }
    };

    const updateAircraftEntities = async () => {
      if (requestInFlightRef.current) {
        return;
      }

      requestInFlightRef.current = true;

      try {
        const startedAt = performance.now();
        const aircraftStates = selectAircraftForRender(
          await fetchWithBackoff(fetchAircraftStates),
        );
        const completedAt = performance.now();

        if (cancelled || viewer.isDestroyed()) {
          return;
        }

        warnedFailureRef.current = false;
        useWorldStore.getState().updateFeedStatus("aircraft", {
          online: true,
          count: aircraftStates.length,
          latencyMs: Math.round(completedAt - startedAt),
          updatedAt: new Date().toISOString(),
        });

        const liveEntityIds = new Set<string>();
        const now = Date.now();
        aircraftStates.forEach((aircraft) => {
          const entityId = createAircraftEntityId(aircraft.icao24);
          const altitudeMeters = aircraft.onGround ? 0 : aircraft.altitudeMeters ?? 0;
          const position = Cartesian3.fromDegrees(aircraft.longitude, aircraft.latitude, altitudeMeters);
          const label = formatAircraftName(aircraft);
          const positionProperty = refs.positionByEntityId.get(entityId);
          const visualState = getAircraftVisualState(aircraft);
          const icon = getAircraftIconDataUrl(visualState);

          liveEntityIds.add(entityId);
          refs.entityIds.add(entityId);
          refs.aircraftByEntityId.set(entityId, aircraft);

          if (positionProperty) {
            const current = positionProperty.getValue(viewer.clock.currentTime) ?? position;
            refs.interpolationByEntityId.set(entityId, {
              from: Cartesian3.clone(current),
              to: position,
              startedAt: now,
              endsAt: now + AIRCRAFT_REFRESH_INTERVAL_MS,
            });

            const existingEntity = viewer.entities.getById(entityId);
            if (existingEntity?.billboard) {
              existingEntity.billboard.rotation = new ConstantProperty(
                CesiumMath.toRadians(-(aircraft.headingDegrees ?? 0)),
              );
              if (refs.visualStateByEntityId.get(entityId) !== visualState) {
                existingEntity.billboard.image = new ConstantProperty(icon);
                refs.visualStateByEntityId.set(entityId, visualState);
              }
            }
            return;
          }

          const newPositionProperty = new ConstantPositionProperty(position);
          const labelVisibilityProperty = new ConstantProperty(false);
          refs.positionByEntityId.set(entityId, newPositionProperty);
          refs.labelVisibilityByEntityId.set(entityId, labelVisibilityProperty);
          refs.visualStateByEntityId.set(entityId, visualState);

          const entity = viewer.entities.add({
            id: entityId,
            name: label,
            position: newPositionProperty,
            billboard: {
              image: icon,
              width: 24,
              height: 24,
              rotation: CesiumMath.toRadians(-(aircraft.headingDegrees ?? 0)),
              scale: aircraft.onGround ? 0.68 : 0.82,
              heightReference: HeightReference.NONE,
              distanceDisplayCondition: new DistanceDisplayCondition(0, 18_000_000),
              disableDepthTestDistance: 2_500_000,
            },
            label: {
              show: labelVisibilityProperty,
              text: label,
              font: "500 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fillColor: LABEL_FILL_COLOR,
              outlineColor: LABEL_OUTLINE_COLOR,
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              horizontalOrigin: HorizontalOrigin.CENTER,
              verticalOrigin: VerticalOrigin.BOTTOM,
              pixelOffset: new Cartesian2(0, -10),
              distanceDisplayCondition: new DistanceDisplayCondition(0, AIRCRAFT_LABEL_HEIGHT_THRESHOLD),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          refs.entityById.set(entityId, entity);
        });

        refs.entityIds.forEach((entityId) => {
          if (!liveEntityIds.has(entityId)) {
            viewer.entities.removeById(entityId);
            refs.entityById.delete(entityId);
            refs.aircraftByEntityId.delete(entityId);
            refs.positionByEntityId.delete(entityId);
            refs.labelVisibilityByEntityId.delete(entityId);
            refs.interpolationByEntityId.delete(entityId);
            refs.visualStateByEntityId.delete(entityId);
          }
        });

        refs.entityIds = liveEntityIds;
        syncAircraftLabels(viewer, refs, movingRef.current);
        viewer.scene.requestRender();
      } catch (error) {
        useWorldStore.getState().updateFeedStatus("aircraft", {
          online: false,
        });
        warnFeedFailureOnce("OpenSky aircraft", error, warnedFailureRef);
      } finally {
        requestInFlightRef.current = false;
      }
    };

    const clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(movement.position) as { id?: { id?: string } } | undefined;
      const pickedId = picked?.id?.id;

      if (!pickedId?.startsWith("aircraft:")) {
        return;
      }

      const aircraft = refs.aircraftByEntityId.get(pickedId);
      if (!aircraft) {
        return;
      }

      useWorldStore.getState().setSelectedEntity({
        id: aircraft.icao24.toUpperCase(),
        name: formatAircraftName(aircraft),
        kind: "aircraft",
        metadata: toAircraftEntityMetadata(aircraft),
      });
      viewer.entities.removeById(SATELLITE_TRAIL_ENTITY_ID);
      trailPositionsRef.current = [];
      lastTrailSampleAtRef.current = 0;
      syncAircraftLabels(viewer, refs, movingRef.current);
      viewer.scene.requestRender();
    }, ScreenSpaceEventType.LEFT_CLICK);

    const removeMoveStart = viewer.camera.moveStart.addEventListener(() => {
      movingRef.current = true;
      syncAircraftLabels(viewer, refs, true);
    });
    const removeMoveEnd = viewer.camera.moveEnd.addEventListener(() => {
      movingRef.current = false;
      syncAircraftLabels(viewer, refs, false);
      viewer.scene.requestRender();
    });
    const unsubscribeSelection = useWorldStore.subscribe((state, previousState) => {
      if (state.selectedEntity === previousState.selectedEntity) {
        return;
      }

      syncAircraftLabels(viewer, refs, movingRef.current);
      viewer.scene.requestRender();
    });

    void updateAircraftEntities();
    const refreshInterval = window.setInterval(() => {
      void updateAircraftEntities();
    }, AIRCRAFT_REFRESH_INTERVAL_MS);
    let animationTimeout: number | null = null;
    let animationCancelled = false;
    const runAnimationStep = () => {
      if (animationCancelled) {
        return;
      }

      const now = Date.now();

      refs.interpolationByEntityId.forEach((interpolation, entityId) => {
        const positionProperty = refs.positionByEntityId.get(entityId);
        if (!positionProperty) {
          refs.interpolationByEntityId.delete(entityId);
          return;
        }

        const denominator = interpolation.endsAt - interpolation.startedAt;
        if (denominator <= 0) {
          refs.interpolationByEntityId.delete(entityId);
          return;
        }

        const t = Math.min(Math.max((now - interpolation.startedAt) / denominator, 0), 1);
        const eased = t * t * (3 - 2 * t);
        const interpolatedPosition = new Cartesian3();
        Cartesian3.lerp(
          interpolation.from,
          interpolation.to,
          eased,
          interpolatedPosition,
        );

        positionProperty.setValue(interpolatedPosition);

        if (t >= 1) {
          refs.interpolationByEntityId.delete(entityId);
        }
      });

      if (refs.interpolationByEntityId.size > 0) {
        viewer.scene.requestRender();
      }

      syncAircraftTrail(now);

      if (trailPositionsRef.current.length > 0) {
        viewer.scene.requestRender();
      }

      const selectedAircraftId = selectedEntityIdForKind("aircraft");
      const hasActiveAnimation = refs.interpolationByEntityId.size > 0 || Boolean(selectedAircraftId);
      animationTimeout = window.setTimeout(
        runAnimationStep,
        hasActiveAnimation ? AIRCRAFT_ANIMATION_INTERVAL_MS : 500,
      );
    };

    runAnimationStep();

    return () => {
      cancelled = true;
      animationCancelled = true;
      window.clearInterval(refreshInterval);
      if (animationTimeout !== null) {
        window.clearTimeout(animationTimeout);
      }
      removeMoveStart();
      removeMoveEnd();
      unsubscribeSelection();
      clickHandler.destroy();
      removeAircraftEntities();
    };
  }, [active, ready, viewerRef]);
}
