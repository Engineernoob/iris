"use client";

import { memo, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { formatAltitude, formatUtcTimestamp } from "@/lib/format";
import { useWorldStore } from "@/store/useWorldStore";

function formatCoordinate(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;

  return `${Math.abs(value).toFixed(4)} ${hemisphere}`;
}

function HudOverlay() {
  const [utcTime, setUtcTime] = useState("---- -- -- --:--:-- UTC");
  const { activeLayers, feeds, hudEnabled, globe } = useWorldStore(
    useShallow((state) => ({
      activeLayers: state.activeLayers,
      feeds: state.feeds,
      hudEnabled: state.activeLayers.hud,
      globe: state.globe,
    })),
  );

  useEffect(() => {
    const updateUtcTime = () => setUtcTime(formatUtcTimestamp(new Date()));

    updateUtcTime();
    const interval = window.setInterval(updateUtcTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (!hudEnabled) {
    return null;
  }

  const coordinateText = globe.coordinates
    ? `${formatCoordinate(globe.coordinates.latitude, "N", "S")} / ${formatCoordinate(
        globe.coordinates.longitude,
        "E",
        "W",
      )}`
    : "Acquiring...";
  const legendItems = [
    { label: "Aircraft", shortLabel: "AIR", active: activeLayers.aircraft, count: feeds.aircraft.count, tone: "bg-cyan-200" },
    { label: "Satellites", shortLabel: "SAT", active: activeLayers.satellites, count: feeds.satellites.count, tone: "bg-emerald-200" },
    { label: "Quakes", shortLabel: "EQ", active: activeLayers.earthquakes, count: feeds.earthquakes.count, tone: "bg-amber-200" },
    { label: "Events", shortLabel: "GEO", active: activeLayers.gdelt, count: feeds.gdelt.count, tone: "bg-violet-200" },
    { label: "Relief", shortLabel: "REL", active: activeLayers.humanitarian, count: feeds.humanitarian.count, tone: "bg-rose-200" },
    { label: "Imagery", shortLabel: "IMG", active: activeLayers.imagery, count: feeds.imagery.count, tone: "bg-orange-200" },
  ].filter((item) => item.active);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-slate-100" aria-label="Globe telemetry overlay">
      <div className="absolute left-5 top-20 h-10 w-10 border-l border-t border-white/10 sm:left-6" aria-hidden="true" />
      <div className="absolute right-5 top-20 h-10 w-10 border-r border-t border-white/10 sm:right-6" aria-hidden="true" />
      <div className="absolute bottom-16 left-5 h-10 w-10 border-b border-l border-white/10 sm:left-6" aria-hidden="true" />
      <div className="absolute bottom-16 right-5 h-10 w-10 border-b border-r border-white/10 sm:right-6" aria-hidden="true" />
      <div
        className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 opacity-60"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-2 h-5 w-px -translate-x-1/2 bg-cyan-100/35" />
        <div className="absolute bottom-2 left-1/2 h-5 w-px -translate-x-1/2 bg-cyan-100/35" />
        <div className="absolute left-2 top-1/2 h-px w-5 -translate-y-1/2 bg-cyan-100/35" />
        <div className="absolute right-2 top-1/2 h-px w-5 -translate-y-1/2 bg-cyan-100/35" />
        <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-cyan-100/35" />
      </div>
      <div
        className="absolute bottom-[4.35rem] left-1/2 hidden max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap justify-center gap-1.5 md:flex"
        role="status"
        aria-live="polite"
      >
        <div className="rounded-xl bg-slate-950/46 px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-slate-200/85 shadow-[0_0_24px_rgba(14,165,233,0.045)] ring-1 ring-white/[0.075] backdrop-blur-xl">
          {coordinateText}
        </div>
        <div className="rounded-xl bg-slate-950/46 px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-slate-200/85 shadow-[0_0_24px_rgba(14,165,233,0.045)] ring-1 ring-white/[0.075] backdrop-blur-xl">
          Zoom {globe.zoomLevel.toFixed(1)}
        </div>
        <div className="rounded-xl bg-slate-950/46 px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-slate-200/85 shadow-[0_0_24px_rgba(14,165,233,0.045)] ring-1 ring-white/[0.075] backdrop-blur-xl">
          Alt {formatAltitude(globe.cameraHeightMeters)}
        </div>
      </div>
      <div className="absolute right-5 top-20 rounded-xl bg-slate-950/46 px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-slate-200/85 ring-1 ring-white/[0.075] backdrop-blur-xl sm:right-6">
        {utcTime}
      </div>
      {legendItems.length > 0 && (
        <div className="absolute bottom-[6.7rem] left-5 hidden max-w-[calc(100vw-2rem)] flex-wrap gap-1.5 rounded-2xl bg-slate-950/42 p-1.5 font-mono text-[0.58rem] uppercase tracking-[0.09em] text-slate-300/82 ring-1 ring-white/[0.075] backdrop-blur-xl lg:flex">
          {legendItems.map((item) => (
            <div key={item.shortLabel} className="grid h-7 grid-cols-[auto_2.2rem_auto] items-center gap-1.5 rounded-xl px-2">
              <span className={`size-2 rounded-[2px] ${item.tone} shadow-[0_0_12px_currentColor]`} aria-hidden="true" />
              <span className="text-slate-400">{item.shortLabel}</span>
              <span className="tabular-nums text-slate-500">{String(item.count).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(HudOverlay);
