"use client";

import { useWorldStore } from "@/store/useWorldStore";

const placeholderFields = [
  ["Type", "Unassigned"],
  ["Signal", "No lock"],
  ["Altitude", "-- km"],
  ["Velocity", "-- m/s"],
  ["Source", "Awaiting selection"],
] as const;

const aircraftFieldOrder = [
  ["callsign", "Callsign"],
  ["ICAO24", "ICAO24"],
  ["country", "Country"],
  ["altitude", "Altitude"],
  ["velocity", "Velocity"],
  ["heading", "Heading"],
  ["lastContact", "Last Contact"],
  ["source", "Source"],
] as const;

const satelliteFieldOrder = [
  ["name", "Name"],
  ["NORAD", "NORAD ID"],
  ["altitude", "Altitude"],
  ["longitude", "Longitude"],
  ["latitude", "Latitude"],
  ["source", "Source"],
] as const;

export function InspectorPanel() {
  const selectedEntity = useWorldStore((state) => state.selectedEntity);
  const panelOpen = useWorldStore((state) => state.panels.right);
  const setPanelOpen = useWorldStore((state) => state.setPanelOpen);

  if (!panelOpen) {
    return (
      <button
        type="button"
        className="absolute right-4 top-20 z-20 min-h-10 rounded-xl bg-slate-950/55 px-3 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-slate-200 shadow-[0_0_34px_rgba(16,185,129,0.07)] ring-1 ring-white/[0.08] backdrop-blur-xl transition-colors hover:bg-slate-900/70"
        onClick={() => setPanelOpen("right", true)}
      >
        Inspector
      </button>
    );
  }

  return (
    <aside className="absolute right-4 top-20 z-20 w-[min(19rem,calc(100vw-2rem))] rounded-2xl bg-slate-950/48 text-slate-100 shadow-[0_0_40px_rgba(16,185,129,0.06),0_20px_70px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.08] backdrop-blur-2xl">
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <div>
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-slate-500">
            Inspector
          </p>
          <h2 className="mt-1 text-xs font-medium text-slate-200">Selected entity</h2>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-200 active:scale-[0.96]"
          aria-label="Collapse inspector panel"
          onClick={() => setPanelOpen("right", false)}
        >
          -
        </button>
      </div>
      <div className="px-4 pb-4 pt-1">
        {selectedEntity ? (
          <div className="rounded-xl bg-white/[0.035] p-3 ring-1 ring-white/[0.06]">
            <div className="border-b border-white/[0.06] pb-3">
              <p className="text-[0.66rem] uppercase tracking-[0.18em] text-slate-500">
                {selectedEntity.kind}
              </p>
              <h3 className="mt-1 font-mono text-sm text-cyan-50">{selectedEntity.name}</h3>
            </div>
            <dl className="mt-3 space-y-2">
              {selectedEntity.metadata && selectedEntity.kind === "aircraft" ? (
                aircraftFieldOrder.map(([key, label]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </dt>
                    <dd className="max-w-40 text-right font-mono text-[0.68rem] tabular-nums text-slate-300">
                      {String(selectedEntity.metadata?.[key] ?? "--")}
                    </dd>
                  </div>
                ))
              ) : selectedEntity.metadata && selectedEntity.kind === "satellite" ? (
                satelliteFieldOrder.map(([key, label]) => (
                    <div key={key} className="flex items-start justify-between gap-4">
                      <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">
                        {label}
                      </dt>
                      <dd className="max-w-40 text-right font-mono text-[0.68rem] tabular-nums text-slate-300">
                        {String(selectedEntity.metadata?.[key] ?? "--")}
                      </dd>
                    </div>
                  ))
              ) : (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">Type</dt>
                        <dd className="font-mono text-[0.68rem] capitalize text-slate-300">
                          {selectedEntity.kind}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">
                          Identifier
                        </dt>
                        <dd className="font-mono text-[0.68rem] text-cyan-100">{selectedEntity.id}</dd>
                      </div>
                    </>
                  )}
            </dl>
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.035] p-3 ring-1 ring-white/[0.06]">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div className="relative grid size-10 place-items-center rounded-full bg-slate-900/80 ring-1 ring-white/[0.08]">
                <span className="size-4 rounded-full border border-slate-500/70" />
                <span className="absolute h-px w-6 bg-slate-500/50" />
                <span className="absolute h-6 w-px bg-slate-500/50" />
              </div>
              <div>
                <p className="text-[0.8rem] font-medium text-slate-200">No entity selected</p>
                <p className="mt-0.5 text-[0.66rem] text-slate-500">Target metadata standby</p>
              </div>
            </div>
            <dl className="mt-3 space-y-2">
              {placeholderFields.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">{label}</dt>
                  <dd className="font-mono text-[0.68rem] tabular-nums text-slate-400">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </aside>
  );
}
