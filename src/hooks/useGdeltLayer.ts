"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  Cartesian3,
  Color,
  ConstantPositionProperty,
  DistanceDisplayCondition,
  HeightReference,
  LabelStyle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer,
} from "cesium";

import type { GdeltEventWithId } from "@/lib/gdelt";
import { fetchGdeltEvents, getEventColor, getEventLabel } from "@/lib/gdelt";
import { useWorldStore } from "@/store/useWorldStore";
import { registerEntityLookup, unregisterEntityLookup } from "./useEntityHover";

const GDELT_INTERVAL_MS = 60_000; // 1 minute
const MAX_GDELT_EVENTS = 50;

type GdeltRefs = {
  entityIds: Set<string>;
  entityById: Map<string, import("cesium").Entity>;
  eventByEntityId: Map<string, GdeltEventWithId>;
};

export function useGdeltLayer(viewerRef: RefObject<Viewer | null>, ready: boolean) {
  const active = useWorldStore((state) => state.activeLayers.gdelt);
  const refsRef = useRef<GdeltRefs>({
    entityIds: new Set(),
    entityById: new Map(),
    eventByEntityId: new Map(),
  });

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!ready || !viewer) {
      return;
    }

    const refs = refsRef.current;

    registerEntityLookup("gdelt:", (cesiumId: string) => {
      const event = refs.eventByEntityId.get(cesiumId);
      if (!event) return null;
      return {
        id: event.id,
        name: getEventLabel(event),
        kind: "gdelt" as const,
        metadata: {
          "Actor 1": event.actor1Name,
          "Actor 2": event.actor2Name,
          "Event Code": event.eventCode,
          "Goldstein Scale": event.goldstein.toFixed(2),
          "Tone": event.avgTone.toFixed(2),
          "Articles": event.numArticles,
          "Latitude": event.lat.toFixed(4),
          "Longitude": event.lon.toFixed(4),
        },
      };
    });

    const removeGdeltEntities = () => {
      refs.entityIds.forEach((entityId) => {
        viewer.entities.removeById(entityId);
      });
      refs.entityIds.clear();
      refs.entityById.clear();
      refs.eventByEntityId.clear();

      const { selectedEntity, setSelectedEntity } = useWorldStore.getState();
      if (selectedEntity?.kind === "gdelt") {
        setSelectedEntity(null);
      }
    };

    if (!active) {
      removeGdeltEntities();
      viewer.scene.requestRender();
      return;
    }

    let cancelled = false;

    const updateGdeltEntities = async () => {
      try {
        const startedAt = performance.now();
        const events = await fetchGdeltEvents(MAX_GDELT_EVENTS);
        const completedAt = performance.now();

        if (cancelled || viewer.isDestroyed()) {
          return;
        }

        useWorldStore.getState().updateFeedStatus("gdelt", {
          online: true,
          count: events.length,
          latencyMs: Math.round(completedAt - startedAt),
          updatedAt: new Date().toISOString(),
        });

        const liveEntityIds = new Set<string>();

        events.forEach((event) => {
          const entityId = event.entityId;
          const position = Cartesian3.fromDegrees(event.lon, event.lat, 50_000);
          const color = Color.fromCssColorString(getEventColor(event.eventBaseCode));
          const label = getEventLabel(event);

          liveEntityIds.add(entityId);
          refs.entityIds.add(entityId);
          refs.eventByEntityId.set(entityId, event);

          const existingEntity = viewer.entities.getById(entityId);
          if (existingEntity) {
            const positionProperty = existingEntity.position as ConstantPositionProperty;
            if (positionProperty) {
              positionProperty.setValue(position);
            }
            return;
          }

          const entity = viewer.entities.add({
            id: entityId,
            position,
            point: {
              pixelSize: 8,
              color,
              outlineColor: Color.WHITE.withAlpha(0.6),
              outlineWidth: 1,
              heightReference: HeightReference.NONE,
              distanceDisplayCondition: new DistanceDisplayCondition(0, 15_000_000),
              disableDepthTestDistance: 3_000_000,
            },
            label: {
              show: false,
              text: label,
              font: "500 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fillColor: color.withAlpha(0.9),
              outlineColor: Color.BLACK.withAlpha(0.8),
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: VerticalOrigin.BOTTOM,
              pixelOffset: new Cartesian3(0, -12, 0),
              distanceDisplayCondition: new DistanceDisplayCondition(0, 8_000_000),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });

          refs.entityById.set(entityId, entity);
        });

        refs.entityIds.forEach((entityId) => {
          if (!liveEntityIds.has(entityId)) {
            viewer.entities.removeById(entityId);
            refs.entityById.delete(entityId);
            refs.eventByEntityId.delete(entityId);
          }
        });

        refs.entityIds = liveEntityIds;
        viewer.scene.requestRender();
      } catch (error) {
        useWorldStore.getState().updateFeedStatus("gdelt", {
          online: false,
        });
        console.error("GDELT update error:", error);
      }
    };

    const clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(movement.position) as { id?: { id?: string } } | undefined;
      const pickedId = picked?.id?.id;

      if (!pickedId?.startsWith("gdelt:")) {
        return;
      }

      const event = refs.eventByEntityId.get(pickedId);
      if (!event) {
        return;
      }

      useWorldStore.getState().setSelectedEntity({
        id: event.id,
        name: getEventLabel(event),
        kind: "gdelt",
        metadata: {
          "Actor 1": event.actor1Name,
          "Actor 2": event.actor2Name,
          "Event Code": event.eventCode,
          "Goldstein Scale": event.goldstein.toFixed(2),
          "Tone": event.avgTone.toFixed(2),
          "Articles": event.numArticles,
          "Latitude": event.lat.toFixed(4),
          "Longitude": event.lon.toFixed(4),
        },
      });
      viewer.scene.requestRender();
    }, ScreenSpaceEventType.LEFT_CLICK);

    const unsubscribeSelection = useWorldStore.subscribe((state, previousState) => {
      if (state.selectedEntity === previousState.selectedEntity) {
        return;
      }
      viewer.scene.requestRender();
    });

    void updateGdeltEntities();
    const interval = window.setInterval(() => {
      void updateGdeltEntities();
    }, GDELT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      clickHandler.destroy();
      unsubscribeSelection();
      unregisterEntityLookup("gdelt:");
      removeGdeltEntities();
    };
  }, [active, ready, viewerRef]);

  return null;
}
