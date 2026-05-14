"use client";

import { memo, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { formatAltitude, formatUtcTimestamp } from "@/lib/format";
import { useWorldStore } from "@/store/useWorldStore";

function formatCoordinate(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;

  return `${Math.abs(value).toFixed(4)} ${hemisphere}`;
}

export const HudOverlay = memo(function HudOverlay() {
  const [utcTime, setUtcTime] = useState("---- -- -- --:--:-- UTC");
  const { hudEnabled, globe } = useWorldStore(
    useShallow((state) => ({
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
    : "Acquiring center";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-slate-100" aria-label="Globe telemetry overlay">
      <div className="absolute left-5 top-20 h-10 w-10 border-l border-t border-white/12 sm:left-6" aria-hidden="true" />
      <div className="absolute right-5 top-20 h-10 w-10 border-r border-t border-white/12 sm:right-6" aria-hidden="true" />
      <div className="absolute bottom-16 left-5 h-10 w-10 border-b border-l border-white/12 sm:left-6" aria-hidden="true" />
      <div className="absolute bottom-16 right-5 h-10 w-10 border-b border-r border-white/12 sm:right-6" aria-hidden="true" />
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
        className="absolute bottom-16 left-1/2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap justify-center gap-2"
        role="status"
        aria-live="polite"
      >
        <div className="rounded-full bg-slate-950/48 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.11em] text-slate-200/90 shadow-[0_0_28px_rgba(14,165,233,0.05)] ring-1 ring-white/[0.08] backdrop-blur-xl">
          {coordinateText}
        </div>
        <div className="rounded-full bg-slate-950/48 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.11em] text-slate-200/90 shadow-[0_0_28px_rgba(14,165,233,0.05)] ring-1 ring-white/[0.08] backdrop-blur-xl">
          Zoom {globe.zoomLevel.toFixed(1)}
        </div>
        <div className="rounded-full bg-slate-950/48 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.11em] text-slate-200/90 shadow-[0_0_28px_rgba(14,165,233,0.05)] ring-1 ring-white/[0.08] backdrop-blur-xl">
          Alt {formatAltitude(globe.cameraHeightMeters)}
        </div>
      </div>
      <div className="absolute right-5 top-20 rounded-full bg-slate-950/48 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.11em] text-slate-200/90 ring-1 ring-white/[0.08] backdrop-blur-xl sm:right-6">
        {utcTime}
      </div>
    </div>
  );
});
