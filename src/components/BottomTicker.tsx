"use client";

import { memo } from "react";
import { useShallow } from "zustand/react/shallow";

import { StatusDot, TelemetryPill } from "@/components/panelPrimitives";
import { formatAltitude } from "@/lib/format";
import { useWorldStore } from "@/store/useWorldStore";

type TickerItem = {
  label: string;
  active: boolean;
  priority: "primary" | "secondary" | "detail";
};

function BottomTicker() {
  const {
    aircraftLayerActive,
    satellitesLayerActive,
    earthquakesLayerActive,
    gdeltLayerActive,
    humanitarianLayerActive,
    imageryLayerActive,
    feeds,
    followEnabled,
    cameraHeightMeters,
    selectedEntityName,
  } = useWorldStore(
    useShallow((state) => ({
      aircraftLayerActive: state.activeLayers.aircraft,
      satellitesLayerActive: state.activeLayers.satellites,
      earthquakesLayerActive: state.activeLayers.earthquakes,
      gdeltLayerActive: state.activeLayers.gdelt,
      humanitarianLayerActive: state.activeLayers.humanitarian,
      imageryLayerActive: state.activeLayers.imagery,
      feeds: state.feeds,
      followEnabled: state.followEnabled,
      cameraHeightMeters: state.globe.cameraHeightMeters,
      selectedEntityName: state.selectedEntity?.name ?? null,
    })),
  );
  const feedOnline = Object.values(feeds).some((feed) => feed.online);
  const tickerItems: TickerItem[] = [
    { label: `${feeds.aircraft.count} aircraft`, active: aircraftLayerActive, priority: "primary" },
    {
      label: `${feeds.satellites.count} satellites`,
      active: satellitesLayerActive,
      priority: "primary",
    },
    {
      label: `${feeds.earthquakes.count} quakes`,
      active: earthquakesLayerActive,
      priority: "primary",
    },
    {
      label: `${feeds.gdelt.count} events`,
      active: gdeltLayerActive,
      priority: "secondary",
    },
    {
      label: `${feeds.humanitarian.count} relief`,
      active: humanitarianLayerActive,
      priority: "secondary",
    },
    {
      label: `${feeds.imagery.count} imagery`,
      active: imageryLayerActive,
      priority: "secondary",
    },
    {
      label: feedOnline ? "feed synced" : "feed acquiring",
      active: feedOnline,
      priority: "detail",
    },
    {
      label: `camera altitude ${formatAltitude(cameraHeightMeters)}`,
      active: true,
      priority: "detail",
    },
    {
      label: `selected ${selectedEntityName}`,
      active: Boolean(selectedEntityName),
      priority: "detail",
    },
  ];
  const visibleTickerItems = tickerItems.filter((item) => item.active);
  const primaryTickerItems = visibleTickerItems.filter((item) => item.priority === "primary");
  const secondaryTickerItems = visibleTickerItems.filter((item) => item.priority === "secondary");
  const detailTickerItems = visibleTickerItems.filter((item) => item.priority === "detail");

  return (
    <footer className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 text-slate-300 sm:px-5">
      <div className="mx-auto flex h-10 max-w-[1120px] items-center gap-2 overflow-hidden rounded-2xl bg-slate-950/64 px-2.5 shadow-[0_14px_48px_rgba(0,0,0,0.28),0_0_24px_rgba(14,165,233,0.045)] ring-1 ring-white/[0.085] backdrop-blur-2xl">
        <div className="flex min-w-0 shrink-0 items-center gap-2 rounded-xl bg-white/[0.035] px-2.5 py-1 ring-1 ring-white/[0.055]">
          <StatusDot active={feedOnline} tone="emerald" glow />
          <span className="hidden font-mono text-[0.58rem] uppercase tracking-[0.1em] text-slate-400 sm:inline">
            {followEnabled && selectedEntityName ? "Tracking" : "Scan"}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {primaryTickerItems.map((item) => (
            <TelemetryPill
              key={item.label}
              label={item.label}
              active={item.active}
            />
          ))}
          {secondaryTickerItems.map((item) => (
            <span className="hidden md:inline-flex" key={item.label}>
              <TelemetryPill label={item.label} active={item.active} />
            </span>
          ))}
          {detailTickerItems.map((item) => (
            <span className="hidden xl:inline-flex" key={item.label}>
              <TelemetryPill label={item.label} active={item.active} />
            </span>
          ))}
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <StatusDot active={feeds.aircraft.online} tone="cyan" />
          <StatusDot active={feeds.satellites.online} tone="emerald" />
          <StatusDot
            active={
              feeds.earthquakes.online ||
              feeds.gdelt.online ||
              feeds.humanitarian.online ||
              feeds.imagery.online
            }
            tone="violet"
          />
        </div>
      </div>
    </footer>
  );
}

export default memo(BottomTicker);
