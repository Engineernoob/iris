"use client";

import { useEffect, useState } from "react";

import { useWorldStore } from "@/store/useWorldStore";

export function HudOverlay() {
  const [utcTime, setUtcTime] = useState(() => new Date());
  const hudEnabled = useWorldStore((state) => state.activeLayers.hud);

  useEffect(() => {
    const interval = window.setInterval(() => setUtcTime(new Date()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (!hudEnabled) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-slate-200">
      <div className="absolute left-6 top-20 h-10 w-10 border-l border-t border-white/15" />
      <div className="absolute right-6 top-20 h-10 w-10 border-r border-t border-white/15" />
      <div className="absolute bottom-16 left-6 h-10 w-10 border-b border-l border-white/15" />
      <div className="absolute bottom-16 right-6 h-10 w-10 border-b border-r border-white/15" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 opacity-70">
        <div className="absolute left-1/2 top-2 h-5 w-px -translate-x-1/2 bg-cyan-100/35" />
        <div className="absolute bottom-2 left-1/2 h-5 w-px -translate-x-1/2 bg-cyan-100/35" />
        <div className="absolute left-2 top-1/2 h-px w-5 -translate-y-1/2 bg-cyan-100/35" />
        <div className="absolute right-2 top-1/2 h-px w-5 -translate-y-1/2 bg-cyan-100/35" />
        <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-cyan-100/35" />
      </div>
      <div className="absolute bottom-16 left-1/2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap justify-center gap-2">
        <div className="rounded-full bg-slate-950/42 px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-slate-300 shadow-[0_0_30px_rgba(14,165,233,0.06)] ring-1 ring-white/[0.07] backdrop-blur-xl">
          37.7749 N / 122.4194 W
        </div>
        <div className="rounded-full bg-slate-950/42 px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-slate-300 shadow-[0_0_30px_rgba(14,165,233,0.06)] ring-1 ring-white/[0.07] backdrop-blur-xl">
          Zoom 4.8
        </div>
        <div className="rounded-full bg-slate-950/42 px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-slate-300 shadow-[0_0_30px_rgba(14,165,233,0.06)] ring-1 ring-white/[0.07] backdrop-blur-xl">
          Alt 12,430 km
        </div>
      </div>
      <div className="absolute right-6 top-20 rounded-full bg-slate-950/42 px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-slate-300 ring-1 ring-white/[0.07] backdrop-blur-xl">
        {utcTime.toISOString().replace("T", " ").slice(0, 19)} UTC
      </div>
    </div>
  );
}
