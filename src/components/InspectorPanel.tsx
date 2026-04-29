"use client";

import { memo } from "react";
import { useShallow } from "zustand/react/shallow";

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

function InspectorPanel() {
  const { selectedEntity, panelOpen, setPanelOpen } = useWorldStore(
    useShallow((state) => ({
      selectedEntity: state.selectedEntity,
      panelOpen: state.panels.right,
      setPanelOpen: state.setPanelOpen,
    })),
  );

  if (!panelOpen) {
    return (
      <button
        type="button"
        className="absolute right-4 top-20 z-20 flex h-10 items-center gap-2 rounded-lg bg-slate-950/70 px-3 text-[0.65rem] font-medium uppercase tracking-wider text-slate-400 transition-all hover:bg-slate-900/80 hover:text-slate-200 active:scale-[0.97]"
        onClick={() => setPanelOpen("right", true)}
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Inspector
      </button>
    );
  }

  return (
    <aside className="absolute right-4 top-20 z-20 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-slate-950/70 text-slate-100 shadow-xl ring-1 ring-white/[0.06] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
        <p className="text-[0.6rem] font-medium uppercase tracking-widest text-slate-500">
          Inspector
        </p>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-300 active:scale-[0.95]"
          aria-label="Collapse inspector panel"
          onClick={() => setPanelOpen("right", false)}
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4">
        {selectedEntity ? (
          <div>
            <div className="mb-3 border-b border-white/[0.05] pb-3">
              <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                {selectedEntity.kind}
              </p>
              <h3 className="mt-1 font-mono text-base font-medium text-slate-100">{selectedEntity.name}</h3>
            </div>
            <dl className="space-y-2.5">
              {selectedEntity.metadata && selectedEntity.kind === "aircraft" ? (
                aircraftFieldOrder.map(([key, label]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                      {label}
                    </dt>
                    <dd className="max-w-44 text-right font-mono text-[0.7rem] tabular-nums text-slate-300">
                      {String(selectedEntity.metadata?.[key] ?? "--")}
                    </dd>
                  </div>
                ))
              ) : selectedEntity.metadata && selectedEntity.kind === "satellite" ? (
                satelliteFieldOrder.map(([key, label]) => (
                    <div key={key} className="flex items-start justify-between gap-4">
                      <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                        {label}
                      </dt>
                      <dd className="max-w-44 text-right font-mono text-[0.7rem] tabular-nums text-slate-300">
                        {String(selectedEntity.metadata?.[key] ?? "--")}
                      </dd>
                    </div>
                  ))
              ) : (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">Type</dt>
                        <dd className="font-mono text-[0.7rem] capitalize text-slate-300">
                          {selectedEntity.kind}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                          Identifier
                        </dt>
                        <dd className="font-mono text-[0.7rem] text-cyan-400">{selectedEntity.id}</dd>
                      </div>
                    </>
                  )}
            </dl>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center gap-3 border-b border-white/[0.05] pb-3">
              <div className="grid size-10 place-items-center rounded-lg bg-slate-900/80 ring-1 ring-white/[0.08]">
                <svg className="size-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">No selection</p>
                <p className="mt-0.5 text-[0.65rem] text-slate-500">Select an asset to inspect</p>
              </div>
            </div>
            <dl className="space-y-2.5">
              {placeholderFields.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">{label}</dt>
                  <dd className="font-mono text-[0.7rem] tabular-nums text-slate-400">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </aside>
  );
}

export default memo(InspectorPanel);
