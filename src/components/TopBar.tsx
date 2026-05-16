"use client";

import { memo, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { StatusDot } from "@/components/panelPrimitives";
import { formatUtcClock } from "@/lib/format";
import { useWorldStore } from "@/store/useWorldStore";

function TopBar() {
  const [utcTime, setUtcTime] = useState("--:--:--");
  const { feeds, followEnabled, selectedEntityName, sensorMode } = useWorldStore(
    useShallow((state) => ({
      feeds: state.feeds,
      followEnabled: state.followEnabled,
      selectedEntityName: state.selectedEntity?.name ?? null,
      sensorMode: state.sensorMode,
    })),
  );
  const latencyMs = Math.max(
    feeds.aircraft.latencyMs ?? 0,
    feeds.satellites.latencyMs ?? 0,
    feeds.earthquakes.latencyMs ?? 0,
    feeds.gdelt.latencyMs ?? 0,
    feeds.humanitarian.latencyMs ?? 0,
    feeds.imagery.latencyMs ?? 0,
  );
  const signalCount = feeds.earthquakes.count + feeds.gdelt.count + feeds.humanitarian.count + feeds.imagery.count;
  const signalOnline = feeds.earthquakes.online || feeds.gdelt.online || feeds.humanitarian.online || feeds.imagery.online;
  const trackingLabel = followEnabled && selectedEntityName ? selectedEntityName : "Free scan";

  useEffect(() => {
    const updateUtcTime = () => setUtcTime(formatUtcClock(new Date()));

    updateUtcTime();
    const interval = window.setInterval(updateUtcTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="absolute inset-x-0 top-0 z-30 px-3 pt-3 text-slate-100 sm:px-5">
      <div className="mx-auto grid min-h-14 max-w-[1500px] grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.35rem] bg-slate-950/66 px-3 shadow-[0_18px_70px_rgba(0,0,0,0.34),0_0_38px_rgba(14,165,233,0.07)] ring-1 ring-white/[0.1] backdrop-blur-2xl sm:px-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="grid size-9 place-items-center rounded-2xl bg-cyan-300/[0.1] text-[0.72rem] font-semibold tracking-[0.18em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08)] ring-1 ring-cyan-200/18"
            aria-hidden="true"
          >
            I
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <h1 className="truncate text-[0.9rem] font-semibold tracking-[0.26em] text-white">IRIS</h1>
              <span className="hidden text-[0.58rem] font-medium uppercase tracking-[0.16em] text-cyan-100/55 sm:inline">
                Spatial Ops
              </span>
            </div>
            <p className="mt-0.5 hidden max-w-[28rem] truncate font-mono text-[0.58rem] uppercase tracking-[0.11em] text-slate-500 md:block">
              {sensorMode} / {followEnabled ? "Tracking" : "Wide scan"} / {trackingLabel}
            </p>
          </div>
        </div>
        <label className="mx-auto hidden h-10 w-full max-w-[32rem] items-center rounded-2xl bg-white/[0.045] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-white/[0.075] transition-[background-color,box-shadow] focus-within:bg-white/[0.07] focus-within:ring-cyan-200/32 md:flex">
          <span className="sr-only">Search coordinates, assets, or signals</span>
          <span className="mr-2.5 size-1.5 rounded-full bg-cyan-200/70 shadow-[0_0_12px_rgba(103,232,249,0.28)]" aria-hidden="true" />
          <input
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Search coordinates, asset, signal"
            type="search"
          />
        </label>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {[
            ["AIR", feeds.aircraft.online, "cyan", feeds.aircraft.count],
            ["SAT", feeds.satellites.online, "emerald", feeds.satellites.count],
            ["SIG", signalOnline, "violet", signalCount],
          ].map(([label, online, tone, count]) => (
            <div
              key={String(label)}
              className="flex h-10 min-w-20 items-center justify-between gap-2 rounded-2xl bg-white/[0.042] px-3 font-mono text-[0.6rem] uppercase tracking-[0.11em] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-white/[0.065]"
            >
              <span className="flex items-center gap-2">
                <StatusDot active={Boolean(online)} tone={tone as "cyan" | "emerald" | "violet"} />
                <span className={online ? "text-slate-200" : "text-slate-500"}>{label}</span>
              </span>
              <span className="tabular-nums text-slate-500">{String(count).padStart(2, "0")}</span>
            </div>
          ))}
          <div className="flex h-10 items-center gap-2 rounded-2xl bg-emerald-300/[0.075] px-3 font-mono text-[0.6rem] uppercase tracking-[0.11em] text-emerald-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-emerald-200/14" role="status" aria-live="polite">
            <StatusDot active tone="emerald" />
            <span className="tabular-nums">UTC {utcTime}</span>
            <span className="text-slate-500">/ {latencyMs || "--"}MS</span>
          </div>
        </div>
        <div className="flex h-10 items-center gap-2 rounded-2xl bg-white/[0.045] px-3 font-mono text-[0.6rem] uppercase tracking-[0.11em] text-slate-400 ring-1 ring-white/[0.07] lg:hidden">
          <StatusDot active={feeds.aircraft.online || feeds.satellites.online || signalOnline} tone="emerald" />
          <span className="tabular-nums">{utcTime}</span>
        </div>
      </div>
    </header>
  );
}

export default memo(TopBar);
