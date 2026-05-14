"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from "cesium";

import { useWorldStore } from "@/store/useWorldStore";
import type { SelectedEntity } from "@/store/useWorldStore";

type LookupFunction = (cesiumId: string) => SelectedEntity | null;

const entityLookups = new Map<string, LookupFunction>();

export function registerEntityLookup(
  prefix: string,
  lookup: LookupFunction,
) {
  entityLookups.set(prefix, lookup);
}

export function unregisterEntityLookup(prefix: string) {
  entityLookups.delete(prefix);
}

function lookupEntity(cesiumId: string): SelectedEntity | null {
  for (const [prefix, lookup] of entityLookups.entries()) {
    if (cesiumId.startsWith(prefix)) {
      return lookup(cesiumId);
    }
  }
  return null;
}

export function useEntityHover(
  viewerRef: RefObject<Viewer | null>,
  ready: boolean,
) {
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!ready || !viewer) {
      return;
    }

    const moveHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    moveHandler.setInputAction(
      (movement: ScreenSpaceEventHandler.MotionEvent) => {
        if (hoverTimeoutRef.current) {
          window.clearTimeout(hoverTimeoutRef.current);
        }

        hoverTimeoutRef.current = window.setTimeout(() => {
          const picked = viewer.scene.pick(
            movement.endPosition,
          ) as { id?: { id?: string } } | undefined;
          const pickedId = picked?.id?.id;

          if (!pickedId) {
            useWorldStore.getState().setHoveredEntity(null, null);
            return;
          }

          const entity = lookupEntity(pickedId);

          if (!entity) {
            useWorldStore.getState().setHoveredEntity(null, null);
            return;
          }

          useWorldStore.getState().setHoveredEntity(entity, {
            x: movement.endPosition.x,
            y: movement.endPosition.y,
          });
        }, 50);
      },
      ScreenSpaceEventType.MOUSE_MOVE,
    );

    return () => {
      moveHandler.destroy();
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
      useWorldStore.getState().setHoveredEntity(null, null);
    };
  }, [ready, viewerRef]);
}
