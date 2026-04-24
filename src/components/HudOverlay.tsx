"use client";

import { useEffect, useState } from "react";

import { useWorldStore } from "@/store/useWorldStore";

function formatCoordinate(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;

  return `${Math.abs(value).toFixed(4)} ${hemisphere}`;
}

export function HudOverlay() {
  const [utcTime, setUtcTime] = useState(() => new Date());
  const hudEnabled = useWorldStore((state) => state.activeLayers.hud);
  const globe = useWorldStore((state) => state.globe);

  useEffect(() => {
    const interval = window.setInterval(() => setUtcTime(new Date()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (!hudEnabled) {
    return null;
  }

  const coordinates = globe.coordinates;
  const coordinateText = coordinates
    ? `${formatCoordinate(coordinates.latitude, "N", "S")} / ${formatCoordinate(
        coordinates.longitude,
        "E",
        "W",
      )}`
    : "Acquiring coordinates";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-cyan-100">
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-cyan-200/70" />
        <div className="absolute bottom-0 left-1/2 h-8 w-px -translate-x-1/2 bg-cyan-200/70" />
        <div className="absolute left-0 top-1/2 h-px w-8 -translate-y-1/2 bg-cyan-200/70" />
        <div className="absolute right-0 top-1/2 h-px w-8 -translate-y-1/2 bg-cyan-200/70" />
        <div className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 border border-cyan-200/70" />
      </div>
      <div className="absolute bottom-16 left-4 max-w-[calc(100vw-2rem)] border border-cyan-300/20 bg-black/45 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-cyan-100 backdrop-blur-md sm:left-6">
        <div>{coordinateText}</div>
        <div className="mt-1 text-slate-400">
          Zoom {globe.zoomLevel.toFixed(1)} / Alt {Math.round(globe.cameraHeightMeters).toLocaleString()} m
        </div>
      </div>
      <div className="absolute bottom-16 right-4 border border-emerald-300/20 bg-black/45 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-emerald-100 backdrop-blur-md sm:right-6">
        {utcTime.toISOString().replace("T", " ").slice(0, 19)} UTC
      </div>
    </div>
  );
}
