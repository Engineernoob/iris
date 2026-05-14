"use client";

import { memo } from "react";
import { useShallow } from "zustand/react/shallow";

<<<<<<< HEAD
import { formatAltitude } from "@/lib/format";
import { useWorldStore } from "@/store/useWorldStore";

export const BottomTicker = memo(function BottomTicker() {
  const {
    aircraftLayerActive,
    satellitesLayerActive,
=======
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
    gdeltLayerActive,
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
    feeds,
    cameraHeightMeters,
    selectedEntityName,
  } = useWorldStore(
    useShallow((state) => ({
      aircraftLayerActive: state.activeLayers.aircraft,
      satellitesLayerActive: state.activeLayers.satellites,
<<<<<<< HEAD
=======
      gdeltLayerActive: state.activeLayers.gdelt,
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
      feeds: state.feeds,
      cameraHeightMeters: state.globe.cameraHeightMeters,
      selectedEntityName: state.selectedEntity?.name ?? null,
    })),
  );
  const visibleTickerItems = [
<<<<<<< HEAD
    { label: aircraftLayerActive ? `${feeds.aircraft.count} aircraft tracked` : "aircraft layer standby", active: aircraftLayerActive },
    {
      label: satellitesLayerActive ? `${feeds.satellites.count} satellites tracked` : "satellite layer standby",
      active: satellitesLayerActive,
    },
    { label: feeds.aircraft.online || feeds.satellites.online ? "feed synced" : "feed acquiring", active: feeds.aircraft.online || feeds.satellites.online },
    { label: `camera altitude ${formatAltitude(cameraHeightMeters)}`, active: true },
    { label: `selected ${selectedEntityName ?? "none"}`, active: Boolean(selectedEntityName) },
  ];

  return (
    <footer className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 text-slate-300 sm:px-5">
      <div className="mx-auto flex min-h-10 max-w-[1520px] items-center gap-3 overflow-hidden rounded-2xl bg-slate-950/50 px-3 shadow-[0_18px_70px_rgba(0,0,0,0.24),0_0_34px_rgba(14,165,233,0.05)] ring-1 ring-white/[0.09] backdrop-blur-2xl">
        <div className="shrink-0 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-slate-400/75">
          Telemetry
=======
    aircraftLayerActive ? `${feeds.aircraft.count} aircraft` : null,
    satellitesLayerActive ? `${feeds.satellites.count} satellites` : null,
    gdeltLayerActive ? `${feeds.gdelt?.count ?? 0} events` : null,
    `Alt: ${formatAltitude(cameraHeightMeters)}`,
    selectedEntityName ? `Selected: ${selectedEntityName}` : null,
  ].filter(Boolean);

  return (
    <footer className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-5">
        <div className="mx-auto flex min-h-10 max-w-[1520px] items-center gap-3 overflow-hidden rounded-xl bg-slate-950/60 px-3 ring-1 ring-white/[0.06] backdrop-blur-xl tabular-nums">
        <div className="shrink-0 text-[0.6rem] font-medium uppercase tracking-widest text-slate-500 tabular-nums">
          Live
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
        </div>
        <div className="h-4 w-px shrink-0 bg-white/10" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleTickerItems.map((item) => (
            <span
<<<<<<< HEAD
              key={item.label}
              className="inline-flex h-6 shrink-0 items-center gap-2 rounded-full bg-white/[0.045] px-2.5 font-mono text-[0.65rem] uppercase tracking-[0.11em] text-slate-300/85 ring-1 ring-white/[0.07]"
            >
              <span
                className={`size-1 rounded-full ${
                  item.active
                    ? "bg-emerald-300/75 shadow-[0_0_10px_rgba(110,231,183,0.35)]"
                    : "bg-slate-500/70"
                }`}
                aria-hidden="true"
              />
              {item.label}
=======
              key={item}
              className="inline-flex h-6 shrink-0 items-center rounded-md bg-white/[0.04] px-2.5 font-mono text-[0.6rem] uppercase tracking-wider text-slate-400 transition-transform"
            >
              {item}
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${feeds.aircraft.online ? "bg-cyan-400" : "bg-slate-600"}`} />
          <span className={`size-1.5 rounded-full ${feeds.satellites.online ? "bg-emerald-400" : "bg-slate-600"}`} />
          {feeds.gdelt?.online !== undefined && (
            <span className={`size-1.5 rounded-full ${feeds.gdelt.online ? "bg-violet-400" : "bg-slate-600"}`} />
          )}
        </div>
      </div>
    </footer>
  );
<<<<<<< HEAD
});
=======
}

export default memo(BottomTicker);
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
