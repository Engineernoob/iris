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
    aircraftLayerActive ? `${feeds.aircraft.count} aircraft tracked` : "aircraft layer standby",
    satellitesLayerActive ? `${feeds.satellites.count} satellites tracked` : "satellite layer standby",
    feeds.aircraft.online || feeds.satellites.online ? "feed synced" : "feed acquiring",
    `camera altitude ${formatAltitude(cameraHeightMeters)}`,
    `selected ${selectedEntityName ?? "none"}`,
  ];

  return (
    <footer className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 text-slate-300 sm:px-5">
      <div className="mx-auto flex min-h-10 max-w-[1520px] items-center gap-3 overflow-hidden rounded-2xl bg-slate-950/42 px-3 shadow-[0_0_40px_rgba(14,165,233,0.06),0_18px_70px_rgba(0,0,0,0.24)] ring-1 ring-white/[0.08] backdrop-blur-2xl">
        <div className="shrink-0 text-[0.6rem] font-medium uppercase tracking-[0.22em] text-slate-500">
          Telemetry
        </div>
        <div className="h-4 w-px shrink-0 bg-white/10" />
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap">
          {visibleTickerItems.map((item) => (
            <span
              key={item}
              className="inline-flex h-6 shrink-0 items-center gap-2 rounded-full bg-white/[0.045] px-2.5 font-mono text-[0.63rem] uppercase tracking-[0.12em] text-slate-400 ring-1 ring-white/[0.06]"
            >
              <span
                className={`size-1 rounded-full ${
                  item === "OPEN SKY FEED ACTIVE" || item === "CELESTRAK ORBIT FEED ACTIVE"
                    ? "bg-cyan-200/80 shadow-[0_0_10px_rgba(103,232,249,0.45)]"
                    : "bg-emerald-300/60"
                }`}
              />
              {item}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default memo(BottomTicker);
