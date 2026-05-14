"use client";

<<<<<<< HEAD
import { memo, useEffect, useState } from "react";
=======
import { memo, useEffect, useRef, useState } from "react";
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
import { useShallow } from "zustand/react/shallow";

import { formatAltitude, formatUtcTimestamp } from "@/lib/format";
import { useWorldStore } from "@/store/useWorldStore";

function formatCoordinate(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;

  return `${Math.abs(value).toFixed(4)} ${hemisphere}`;
}

<<<<<<< HEAD
export const HudOverlay = memo(function HudOverlay() {
  const [utcTime, setUtcTime] = useState("---- -- -- --:--:-- UTC");
=======
function formatAltitude(meters: number): string {
  if (meters >= 1_000_000) {
    return `${(meters / 1_000_000).toFixed(2)} Mm`;
  }

  return `${Math.round(meters / 1_000)} km`;
}

function formatUtcTimestamp(date: Date): string {
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

type HudPosition = { x: number; y: number };

function HudOverlay() {
  const [utcTime, setUtcTime] = useState("---- -- -- :--:-- UTC");
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
  const { hudEnabled, globe } = useWorldStore(
    useShallow((state) => ({
      hudEnabled: state.activeLayers.hud,
      globe: state.globe,
    })),
  );
<<<<<<< HEAD
=======
  const [position, setPosition] = useState<HudPosition>({ x: 0, y: 0 });
  const [crosshairPosition, setCrosshairPosition] = useState<HudPosition>({ x: 0, y: 0 });
  const [utcPosition, setUtcPosition] = useState<HudPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingCrosshair, setIsDraggingCrosshair] = useState(false);
  const [isDraggingUtc, setIsDraggingUtc] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const crosshairDragOffset = useRef({ x: 0, y: 0 });
  const utcDragOffset = useRef({ x: 0, y: 0 });
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleUtcMouseDown = (e: React.MouseEvent) => {
    setIsDraggingUtc(true);
    utcDragOffset.current = {
      x: e.clientX - utcPosition.x,
      y: e.clientY - utcPosition.y,
    };
    e.stopPropagation();
  };

  const handleCrosshairMouseDown = (e: React.MouseEvent) => {
    setIsDraggingCrosshair(true);
    crosshairDragOffset.current = {
      x: e.clientX - crosshairPosition.x,
      y: e.clientY - crosshairPosition.y,
    };
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    }
    if (isDraggingCrosshair) {
      setCrosshairPosition({
        x: e.clientX - crosshairDragOffset.current.x,
        y: e.clientY - crosshairDragOffset.current.y,
      });
    }
    if (isDraggingUtc) {
      setUtcPosition({
        x: e.clientX - utcDragOffset.current.x,
        y: e.clientY - utcDragOffset.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingCrosshair(false);
    setIsDraggingUtc(false);
  };

  return (
<<<<<<< HEAD
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
=======
    <div
      className="fixed inset-0 z-10 pointer-events-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="absolute cursor-move pointer-events-auto"
        style={{ left: `${crosshairPosition.x}px`, top: `${crosshairPosition.y}px` }}
        onMouseDown={handleCrosshairMouseDown}
      >
        <div className="absolute -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-6 top-20 h-8 w-8 border-l-2 border-t-2 border-cyan-400/20" />
          <div className="absolute right-6 top-20 h-8 w-8 border-r-2 border-t-2 border-cyan-400/20" />
          <div className="absolute bottom-16 left-6 h-8 w-8 border-b-2 border-l-2 border-cyan-400/20" />
          <div className="absolute bottom-16 right-6 h-8 w-8 border-b-2 border-r-2 border-cyan-400/20" />
          <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-cyan-400/30" />
          <div className="absolute bottom-0 left-1/2 h-4 w-px -translate-x-1/2 bg-cyan-400/30" />
          <div className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-cyan-400/30" />
          <div className="absolute right-0 top-1/2 h-px w-4 -translate-y-1/2 bg-cyan-400/30" />
          <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/40" />
        </div>
      </div>
      <div
        className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 cursor-move pointer-events-auto"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onMouseDown={handleMouseDown}
      >
        <div className="rounded-md bg-slate-950/60 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-slate-400 ring-1 ring-white/[0.05] backdrop-blur-md tabular-nums">
          {coordinateText}
        </div>
        <div className="rounded-md bg-slate-950/60 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-slate-400 ring-1 ring-white/[0.05] backdrop-blur-md tabular-nums">
          Zoom: {globe.zoomLevel.toFixed(1)}
        </div>
        <div className="rounded-md bg-slate-950/60 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-slate-400 ring-1 ring-white/[0.05] backdrop-blur-md tabular-nums">
          Alt: {formatAltitude(globe.cameraHeightMeters)}
        </div>
      </div>
      <div 
        className="absolute cursor-move pointer-events-auto"
        style={{ left: `${utcPosition.x}px`, top: `${utcPosition.y}px` }}
        onMouseDown={handleUtcMouseDown}
      >
        <div className="rounded-md bg-slate-950/60 px-2.5 py-1 font-mono text-[0.6rem] tracking-wider text-slate-400 ring-1 ring-white/[0.05] backdrop-blur-md">
          {utcTime}
        </div>
      </div>
    </div>
  );
}

export default memo(HudOverlay);
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
