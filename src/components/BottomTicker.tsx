"use client";

import { memo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useWorldStore } from "@/store/useWorldStore";

function formatAltitude(meters: number): string {
  if (meters >= 1_000_000) {
    return `${(meters / 1_000_000).toFixed(2)} Mm`;
  }

  return `${Math.round(meters / 1_000)} km`;
}

function BottomTicker() {
  const {
    aircraftLayerActive,
    satellitesLayerActive,
    feeds,
    cameraHeightMeters,
    selectedEntityName,
  } = useWorldStore(
    useShallow((state) => ({
      aircraftLayerActive: state.activeLayers.aircraft,
      satellitesLayerActive: state.activeLayers.satellites,
      feeds: state.feeds,
      cameraHeightMeters: state.globe.cameraHeightMeters,
      selectedEntityName: state.selectedEntity?.name ?? null,
    })),
  );
  const visibleTickerItems = [
    aircraftLayerActive ? `${feeds.aircraft.count} aircraft` : null,
    satellitesLayerActive ? `${feeds.satellites.count} satellites` : null,
    `Alt: ${formatAltitude(cameraHeightMeters)}`,
    selectedEntityName ? `Selected: ${selectedEntityName}` : null,
  ].filter(Boolean);

  return (
    <footer className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-5">
      <div className="mx-auto flex min-h-10 max-w-[1520px] items-center gap-3 overflow-hidden rounded-xl bg-slate-950/60 px-3 ring-1 ring-white/[0.06] backdrop-blur-xl">
        <div className="shrink-0 text-[0.6rem] font-medium uppercase tracking-widest text-slate-500">
          Live
        </div>
        <div className="h-4 w-px shrink-0 bg-white/10" />
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap">
          {visibleTickerItems.map((item) => (
            <span
              key={item}
              className="inline-flex h-6 shrink-0 items-center rounded-md bg-white/[0.04] px-2.5 font-mono text-[0.6rem] uppercase tracking-wider text-slate-400"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${feeds.aircraft.online ? "bg-cyan-400" : "bg-slate-600"}`} />
          <span className={`size-1.5 rounded-full ${feeds.satellites.online ? "bg-emerald-400" : "bg-slate-600"}`} />
        </div>
      </div>
    </footer>
  );
}

export default memo(BottomTicker);
