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

<<<<<<< HEAD
const panelButtonClass =
  "grid size-10 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60 active:scale-[0.96]";

export const InspectorPanel = memo(function InspectorPanel() {
=======
const gdeltFieldOrder = [
  ["Actor 1", "Actor 1"],
  ["Actor 2", "Actor 2"],
  ["Event Code", "Event Code"],
  ["Goldstein Scale", "Goldstein Scale"],
  ["Tone", "Avg Tone"],
  ["Articles", "Articles"],
  ["Latitude", "Latitude"],
  ["Longitude", "Longitude"],
] as const;

function InspectorPanel() {
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
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
<<<<<<< HEAD
        className="absolute right-4 top-20 z-20 min-h-11 rounded-xl bg-slate-950/60 px-3 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-slate-100 shadow-[0_16px_50px_rgba(0,0,0,0.24),0_0_30px_rgba(16,185,129,0.05)] ring-1 ring-white/[0.09] backdrop-blur-xl transition-colors hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60"
=======
        className="absolute right-4 top-20 z-20 flex h-10 items-center gap-2 rounded-lg bg-slate-950/70 px-3 text-[0.65rem] font-medium uppercase tracking-wider text-slate-400 transition-transform hover:bg-slate-900/80 hover:text-slate-200 active:scale-[0.96]"
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
        onClick={() => setPanelOpen("right", true)}
        aria-expanded={false}
        aria-controls="iris-inspector-panel"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Inspector
      </button>
    );
  }

  return (
<<<<<<< HEAD
    <aside
      id="iris-inspector-panel"
      className="absolute right-3 top-[22rem] z-20 max-h-[calc(100dvh-25rem)] w-[min(19rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl bg-slate-950/52 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.28),0_0_34px_rgba(16,185,129,0.05)] ring-1 ring-white/[0.09] backdrop-blur-2xl sm:right-4 lg:top-20 lg:max-h-[calc(100dvh-8.5rem)]"
      aria-labelledby="iris-inspector-title"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <div>
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-slate-500">
            Inspector
          </p>
          <h2 id="iris-inspector-title" className="mt-1 text-xs font-medium text-slate-200">
            Selected entity
          </h2>
        </div>
        <button
          type="button"
          className={panelButtonClass}
=======
    <aside className="absolute right-4 top-20 z-20 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-slate-950/70 text-slate-100 shadow-xl ring-1 ring-white/[0.06] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
        <p className="text-[0.6rem] font-medium uppercase tracking-widest text-slate-500">
          Inspector
        </p>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-md text-slate-500 transition-transform hover:bg-white/[0.05] hover:text-slate-300 active:scale-[0.96]"
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
          aria-label="Collapse inspector panel"
          aria-expanded={true}
          aria-controls="iris-inspector-panel"
          onClick={() => setPanelOpen("right", false)}
        >
<<<<<<< HEAD
          <span aria-hidden="true">-</span>
=======
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
        </button>
      </div>
      <div className="p-4">
        {selectedEntity ? (
<<<<<<< HEAD
          <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.07]">
            <div className="border-b border-white/[0.06] pb-3">
              <p className="text-[0.66rem] uppercase tracking-[0.18em] text-slate-500">
                {selectedEntity.kind}
              </p>
              <h3 className="mt-1 break-words font-mono text-sm text-cyan-50">{selectedEntity.name}</h3>
=======
          <div>
            <div className="mb-3 border-b border-white/[0.05] pb-3">
              <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                {selectedEntity.kind}
              </p>
              <h3 className="mt-1 font-mono text-base font-medium text-slate-100">{selectedEntity.name}</h3>
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
            </div>
            <dl className="space-y-2.5">
              {selectedEntity.metadata && selectedEntity.kind === "aircraft" ? (
                aircraftFieldOrder.map(([key, label]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                      {label}
                    </dt>
<<<<<<< HEAD
                    <dd className="max-w-40 break-words text-right font-mono text-[0.7rem] tabular-nums text-slate-200/90">
=======
                    <dd className="max-w-44 text-right font-mono text-[0.7rem] tabular-nums text-slate-300">
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
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
<<<<<<< HEAD
                      <dd className="max-w-40 break-words text-right font-mono text-[0.7rem] tabular-nums text-slate-200/90">
=======
                      <dd className="max-w-44 text-right font-mono text-[0.7rem] tabular-nums text-slate-300">
                        {String(selectedEntity.metadata?.[key] ?? "--")}
                      </dd>
                    </div>
                  ))
              ) : selectedEntity.metadata && selectedEntity.kind === "gdelt" ? (
                gdeltFieldOrder.map(([key, label]) => (
                    <div key={key} className="flex items-start justify-between gap-4">
                      <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                        {label}
                      </dt>
                      <dd className="max-w-44 text-right font-mono text-[0.7rem] tabular-nums text-slate-300">
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
                        {String(selectedEntity.metadata?.[key] ?? "--")}
                      </dd>
                    </div>
                  ))
              ) : (
                    <>
                      <div className="flex items-center justify-between gap-4">
<<<<<<< HEAD
                        <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">Type</dt>
                        <dd className="font-mono text-[0.7rem] capitalize text-slate-200/90">
=======
                        <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">Type</dt>
                        <dd className="font-mono text-[0.7rem] capitalize text-slate-300">
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
                          {selectedEntity.kind}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                          Identifier
                        </dt>
<<<<<<< HEAD
                        <dd className="break-all font-mono text-[0.7rem] text-cyan-100">{selectedEntity.id}</dd>
=======
                        <dd className="font-mono text-[0.7rem] text-cyan-400">{selectedEntity.id}</dd>
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
                      </div>
                    </>
                  )}
            </dl>
          </div>
        ) : (
<<<<<<< HEAD
          <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.07]">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div
                className="relative grid size-10 place-items-center rounded-full bg-slate-900/80 ring-1 ring-white/[0.08]"
                aria-hidden="true"
              >
                <span className="size-4 rounded-full border border-slate-500/70" />
                <span className="absolute h-px w-6 bg-slate-500/50" />
                <span className="absolute h-6 w-px bg-slate-500/50" />
=======
          <div>
            <div className="mb-3 flex items-center gap-3 border-b border-white/[0.05] pb-3">
              <div className="grid size-10 place-items-center rounded-lg bg-slate-900/80 ring-1 ring-white/[0.08]">
                <svg className="size-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">No selection</p>
                <p className="mt-0.5 text-[0.65rem] text-slate-500">Select an asset to inspect</p>
              </div>
            </div>
            <dl className="space-y-2.5">
              {placeholderFields.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
<<<<<<< HEAD
                  <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">{label}</dt>
                  <dd className="text-right font-mono text-[0.7rem] tabular-nums text-slate-300/85">{value}</dd>
=======
                  <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">{label}</dt>
                  <dd className="font-mono text-[0.7rem] tabular-nums text-slate-400">{value}</dd>
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </aside>
  );
<<<<<<< HEAD
});
=======
}

export default memo(InspectorPanel);
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
