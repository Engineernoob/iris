"use client";

import { memo } from "react";
import { useShallow } from "zustand/react/shallow";

import { StatusDot, TelemetryPill } from "@/components/panelPrimitives";
import { formatAltitude } from "@/lib/format";
import { useWorldStore } from "@/store/useWorldStore";

function BottomTicker() {
  const {
    aircraftLayerActive,
    satellitesLayerActive,
    gdeltLayerActive,
    feeds,
    cameraHeightMeters,
    selectedEntityName,
  } = useWorldStore(
    useShallow((state) => ({
      aircraftLayerActive: state.activeLayers.aircraft,
      satellitesLayerActive: state.activeLayers.satellites,
      gdeltLayerActive: state.activeLayers.gdelt,
      feeds: state.feeds,
      cameraHeightMeters: state.globe.cameraHeightMeters,
      selectedEntityName: state.selectedEntity?.name ?? null,
    })),
  );
  const visibleTickerItems = [
    { label: aircraftLayerActive ? `${feeds.aircraft.count} aircraft tracked` : "aircraft layer standby", active: aircraftLayerActive },
    {
      label: satellitesLayerActive ? `${feeds.satellites.count} satellites tracked` : "satellite layer standby",
      active: satellitesLayerActive,
    },
    {
      label: gdeltLayerActive ? `${feeds.gdelt.count} events tracked` : "gdelt layer standby",
      active: gdeltLayerActive,
    },
    {
      label: feeds.aircraft.online || feeds.satellites.online || feeds.gdelt.online ? "feed synced" : "feed acquiring",
      active: feeds.aircraft.online || feeds.satellites.online || feeds.gdelt.online,
    },
    { label: `camera altitude ${formatAltitude(cameraHeightMeters)}`, active: true },
    { label: `selected ${selectedEntityName ?? "none"}`, active: Boolean(selectedEntityName) },
  ];

  return (
    <footer className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 text-slate-300 sm:px-5">
      <div className="mx-auto flex min-h-10 max-w-[1520px] items-center gap-3 overflow-hidden rounded-2xl bg-slate-950/50 px-3 shadow-[0_18px_70px_rgba(0,0,0,0.24),0_0_34px_rgba(14,165,233,0.05)] ring-1 ring-white/[0.09] backdrop-blur-2xl">
        <div className="shrink-0 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-slate-400/75">
          Telemetry
        </div>
        <div className="h-4 w-px shrink-0 bg-white/10" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleTickerItems.map((item) => (
            <TelemetryPill key={item.label} label={item.label} active={item.active} />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot active={feeds.aircraft.online} tone="cyan" />
          <StatusDot active={feeds.satellites.online} tone="emerald" />
          <StatusDot active={feeds.gdelt.online} tone="violet" />
        </div>
      </div>
    </footer>
  );
}

export default memo(BottomTicker);
