"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantPositionProperty,
  DistanceDisplayCondition,
  HeightReference,
  HorizontalOrigin,
  LabelStyle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer,
} from "cesium";

import {
  AIRCRAFT_LABEL_HEIGHT_THRESHOLD,
  AIRCRAFT_REFRESH_INTERVAL_MS,
  MAX_RENDERED_AIRCRAFT,
  SATELLITE_TRAIL_ENTITY_ID,
} from "@/lib/cesiumConfig";
import {
  createAircraftEntityId,
  formatAircraftName,
  selectedEntityIdForKind,
  toAircraftEntityMetadata,
  updateEntityLabels,
} from "@/lib/cesiumEntityUtils";
import { fetchWithBackoff, warnFeedFailureOnce } from "@/lib/feedRetry";
import type { AircraftState } from "@/lib/opensky";
import { fetchAircraftStates } from "@/lib/opensky";
import { useWorldStore } from "@/store/useWorldStore";

type AircraftRefs = {
  entityIds: Set<string>;
  aircraftByEntityId: Map<string, AircraftState>;
  positionByEntityId: Map<string, ConstantPositionProperty>;
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

  updateEntityLabels(viewer, refs.entityIds, (entityId) => {
    if (moving) {
      return false;
    }

    return closeEnough || entityId === createAircraftEntityId(selectedIcao24 ?? "");
  });
}

export function useAircraftLayer(viewerRef: RefObject<Viewer | null>, ready: boolean) {
  const active = useWorldStore((state) => state.activeLayers.aircraft);
  const refsRef = useRef<AircraftRefs>({
    entityIds: new Set(),
    aircraftByEntityId: new Map(),
    positionByEntityId: new Map(),
  });
  const movingRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const warnedFailureRef = useRef(false);

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
      refs.aircraftByEntityId.clear();
      refs.positionByEntityId.clear();

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

    const updateAircraftEntities = async () => {
      if (requestInFlightRef.current) {
        return;
      }

      requestInFlightRef.current = true;

      try {
        const aircraftStates = selectAircraftForRender(
          await fetchWithBackoff(fetchAircraftStates),
        );

        if (cancelled || viewer.isDestroyed()) {
          return;
        }

        warnedFailureRef.current = false;

        const liveEntityIds = new Set<string>();
        aircraftStates.forEach((aircraft) => {
          const entityId = createAircraftEntityId(aircraft.icao24);
          const altitudeMeters = aircraft.onGround ? 0 : aircraft.altitudeMeters ?? 0;
          const position = Cartesian3.fromDegrees(aircraft.longitude, aircraft.latitude, altitudeMeters);
          const label = formatAircraftName(aircraft);
          const positionProperty = refs.positionByEntityId.get(entityId);

          liveEntityIds.add(entityId);
          refs.entityIds.add(entityId);
          refs.aircraftByEntityId.set(entityId, aircraft);

          if (positionProperty) {
            positionProperty.setValue(position);
            return;
          }

          const newPositionProperty = new ConstantPositionProperty(position);
          refs.positionByEntityId.set(entityId, newPositionProperty);

          viewer.entities.add({
            id: entityId,
            name: label,
            position: newPositionProperty,
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
              show: false,
              text: label,
              font: "500 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fillColor: Color.fromCssColorString("#dffcff").withAlpha(0.92),
              outlineColor: Color.fromCssColorString("#020617").withAlpha(0.9),
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              horizontalOrigin: HorizontalOrigin.CENTER,
              verticalOrigin: VerticalOrigin.BOTTOM,
              pixelOffset: new Cartesian2(0, -10),
              distanceDisplayCondition: new DistanceDisplayCondition(0, AIRCRAFT_LABEL_HEIGHT_THRESHOLD),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });

        refs.entityIds.forEach((entityId) => {
          if (!liveEntityIds.has(entityId)) {
            viewer.entities.removeById(entityId);
            refs.aircraftByEntityId.delete(entityId);
            refs.positionByEntityId.delete(entityId);
          }
        });

        refs.entityIds = liveEntityIds;
        syncAircraftLabels(viewer, refs, movingRef.current);
        viewer.scene.requestRender();
      } catch (error) {
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

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      removeMoveStart();
      removeMoveEnd();
      unsubscribeSelection();
      clickHandler.destroy();
      removeAircraftEntities();
    };
  }, [active, ready, viewerRef]);
}
