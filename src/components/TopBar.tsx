"use client";

<<<<<<< HEAD
import { useEffect, useState } from "react";
=======
import { memo, useEffect, useState } from "react";
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
import { useShallow } from "zustand/react/shallow";

import { formatUtcClock } from "@/lib/format";
import { useWorldStore } from "@/store/useWorldStore";

function formatFeedUpdatedAt(updatedAt: string | null): string {
  if (!updatedAt) {
    return "--:--:-- UTC";
  }

  return `${new Date(updatedAt).toISOString().slice(11, 19)} UTC`;
}

function TopBar() {
  const [utcTime, setUtcTime] = useState("--:--:--");
  const feeds = useWorldStore(useShallow((state) => state.feeds));
  const latencyMs = Math.max(feeds.aircraft.latencyMs ?? 0, feeds.satellites.latencyMs ?? 0);
  const updatedAt =
    [feeds.aircraft.updatedAt, feeds.satellites.updatedAt]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  useEffect(() => {
    const updateUtcTime = () => setUtcTime(formatUtcClock(new Date()));

    updateUtcTime();
    const interval = window.setInterval(updateUtcTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="absolute inset-x-0 top-0 z-30 px-3 pt-3 text-slate-100 sm:px-5">
<<<<<<< HEAD
      <div className="mx-auto flex min-h-12 max-w-[1520px] items-center gap-3 rounded-2xl bg-slate-950/50 px-3 shadow-[0_18px_80px_rgba(0,0,0,0.28),0_0_34px_rgba(14,165,233,0.05)] ring-1 ring-white/[0.09] backdrop-blur-2xl sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="grid size-7 place-items-center rounded-lg bg-white/[0.055] text-[0.63rem] font-semibold tracking-[0.18em] text-cyan-100 ring-1 ring-white/[0.09]"
            aria-hidden="true"
          >
            I
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="truncate text-[0.78rem] font-semibold tracking-[0.28em] text-white">IRIS</h1>
            <span className="hidden text-[0.62rem] font-medium uppercase tracking-[0.16em] text-slate-400/80 sm:inline">
              Spatial Ops
            </span>
          </div>
        </div>
        <label className="mx-auto hidden h-8 w-full max-w-md items-center rounded-xl bg-white/[0.045] px-3 ring-1 ring-white/[0.08] transition-colors focus-within:bg-white/[0.07] focus-within:ring-cyan-200/35 md:flex">
          <span className="sr-only">Search coordinates, assets, or signals</span>
          <span className="mr-2 size-1.5 rounded-full bg-cyan-200/70" aria-hidden="true" />
          <input
            className="w-full bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Search coordinates, asset, signal"
            type="search"
          />
        </label>
        <div className="ml-auto hidden items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-400 lg:flex">
          <span className="tabular-nums">UTC {utcTime}</span>
          <span className={feeds.aircraft.online ? "text-cyan-100/80" : "text-slate-500"}>
            AIR {feeds.aircraft.online ? "ONLINE" : "STANDBY"}
=======
      <div className="mx-auto flex min-h-12 max-w-[1520px] items-center gap-3 rounded-xl bg-slate-950/60 px-4 shadow-lg ring-1 ring-white/[0.06] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded-md bg-cyan-500/10 text-[0.63rem] font-bold tracking-wider text-cyan-400 ring-1 ring-cyan-400/20">
            I
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="truncate text-sm font-bold tracking-widest text-white">IRIS</h1>
            <span className="hidden text-[0.65rem] font-medium uppercase tracking-wider text-slate-500 sm:inline">
              Spatial Intelligence
            </span>
          </div>
        </div>
        <div className="mx-auto hidden h-8 flex-1 items-center rounded-lg bg-white/[0.03] px-3 ring-1 ring-white/[0.05] md:flex">
          <svg className="mr-2 size-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
            placeholder="Search assets, coordinates..."
            aria-label="Search"
          />
        </div>
        <div className="ml-auto hidden items-center gap-4 font-mono text-[0.65rem] uppercase tracking-wider text-slate-400 lg:flex">
          <span className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${feeds.aircraft.online ? "bg-cyan-400" : "bg-slate-600"}`} />
            <span className={feeds.aircraft.online ? "text-cyan-100/90" : "text-slate-500"}>
              {feeds.aircraft.count} Aircraft
            </span>
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${feeds.satellites.online ? "bg-emerald-400" : "bg-slate-600"}`} />
            <span className={feeds.satellites.online ? "text-emerald-100/90" : "text-slate-500"}>
              {feeds.satellites.count} Satellites
            </span>
          </span>
<<<<<<< HEAD
          <span className="tabular-nums">LATENCY {latencyMs || "--"} MS</span>
          <span className="tabular-nums">UPDATED {formatFeedUpdatedAt(updatedAt)}</span>
        </div>
        <div
          className="flex h-8 items-center gap-2 rounded-full bg-emerald-300/[0.08] px-2.5 ring-1 ring-emerald-200/15"
          role="status"
          aria-live="polite"
        >
          <span className="size-1.5 rounded-full bg-emerald-300/80" aria-hidden="true" />
          <span className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-emerald-100/80">
            Online
=======
          <span className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${feeds.gdelt?.online ? "bg-violet-400" : "bg-slate-600"}`} />
            <span className={feeds.gdelt?.online ? "text-violet-100/90" : "text-slate-500"}>
              {feeds.gdelt?.count ?? 0} Events
            </span>
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
          </span>
          <span className="text-slate-500">{utcTime} UTC</span>
        </div>
      </div>
    </header>
  );
}

export default memo(TopBar);
