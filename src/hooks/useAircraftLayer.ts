"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  DistanceDisplayCondition,
  HeightReference,
  HorizontalOrigin,
  LabelStyle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer,
} from "cesium";

import { fetchWithBackoff, warnFeedFailureOnce } from "@/lib/feedRetry";
import type { AircraftState } from "@/lib/opensky";
import { fetchAircraftStates } from "@/lib/opensky";
import { useWorldStore } from "@/store/useWorldStore";

const AIRCRAFT_REFRESH_INTERVAL_MS = 20_000;
const MAX_RENDERED_AIRCRAFT = 250;
const AIRCRAFT_LABEL_HEIGHT_THRESHOLD = 1_250_000;

type AircraftRefs = {
  entityIds: Set<string>;
  aircraftByEntityId: Map<string, AircraftState>;
  positionByEntityId: Map<string, ConstantPositionProperty>;
};

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

function createAircraftEntityId(icao24: string): string {
  return `aircraft:${icao24}`;
}

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

function setAircraftLabelsVisible(viewer: Viewer, refs: AircraftRefs, visible: boolean) {
  refs.entityIds.forEach((entityId) => {
    const entity = viewer.entities.getById(entityId);

    if (entity?.label) {
      entity.label.show = new ConstantProperty(visible);
    }
  });
}

export function useAircraftLayer(
  viewerRef: RefObject<Viewer | null>,
  ready: boolean,
  active: boolean,
) {
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
        const labelsVisible = shouldShowLabels(viewer, movingRef.current);

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
            const existingEntity = viewer.entities.getById(entityId);

            if (existingEntity?.label) {
              existingEntity.label.show = new ConstantProperty(labelsVisible);
            }

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
      viewer.entities.removeById("satellite:selected-trail");
      viewer.scene.requestRender();
    }, ScreenSpaceEventType.LEFT_CLICK);

    const removeMoveStart = viewer.camera.moveStart.addEventListener(() => {
      movingRef.current = true;
      setAircraftLabelsVisible(viewer, refs, false);
    });
    const removeMoveEnd = viewer.camera.moveEnd.addEventListener(() => {
      movingRef.current = false;
      setAircraftLabelsVisible(viewer, refs, shouldShowLabels(viewer, false));
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
      clickHandler.destroy();
      removeAircraftEntities();
    };
  }, [active, ready, viewerRef]);
}
