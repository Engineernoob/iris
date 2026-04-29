"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { useWorldStore } from "@/store/useWorldStore";

function formatCoordinate(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;

  return `${Math.abs(value).toFixed(4)} ${hemisphere}`;
}

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
  const { hudEnabled, globe } = useWorldStore(
    useShallow((state) => ({
      hudEnabled: state.activeLayers.hud,
      globe: state.globe,
    })),
  );
  const [position, setPosition] = useState<HudPosition>({ x: 0, y: 0 });
  const [crosshairPosition, setCrosshairPosition] = useState<HudPosition>({ x: 0, y: 0 });
  const [utcPosition, setUtcPosition] = useState<HudPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingCrosshair, setIsDraggingCrosshair] = useState(false);
  const [isDraggingUtc, setIsDraggingUtc] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const crosshairDragOffset = useRef({ x: 0, y: 0 });
  const utcDragOffset = useRef({ x: 0, y: 0 });

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
        <div className="rounded-md bg-slate-950/60 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-slate-400 ring-1 ring-white/[0.05] backdrop-blur-md">
          {coordinateText}
        </div>
        <div className="rounded-md bg-slate-950/60 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-slate-400 ring-1 ring-white/[0.05] backdrop-blur-md">
          Zoom: {globe.zoomLevel.toFixed(1)}
        </div>
        <div className="rounded-md bg-slate-950/60 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-slate-400 ring-1 ring-white/[0.05] backdrop-blur-md">
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
