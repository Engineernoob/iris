"use client";

import { memo } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  OpenPanelButton,
  PanelCollapseButton,
  PanelHeader,
  PanelShell,
} from "@/components/panelPrimitives";
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
  const { followEnabled, selectedEntity, panelOpen, setFollowEnabled, setPanelOpen } = useWorldStore(
    useShallow((state) => ({
      followEnabled: state.followEnabled,
      selectedEntity: state.selectedEntity,
      panelOpen: state.panels.right,
      setFollowEnabled: state.setFollowEnabled,
      setPanelOpen: state.setPanelOpen,
    })),
  );

  if (!panelOpen) {
    return (
      <OpenPanelButton
        accent="emerald"
        side="right"
        controls="iris-inspector-panel"
        icon={
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        onClick={() => setPanelOpen("right", true)}
      >
        Inspector
      </OpenPanelButton>
    );
  }

  return (
    <PanelShell
      id="iris-inspector-panel"
      labelledBy="iris-inspector-title"
      accent="emerald"
      side="right"
      widthClassName="w-[min(20rem,calc(100vw-1.5rem))]"
    >
      <PanelHeader eyebrow="Inspector" title="Selected entity" titleId="iris-inspector-title">
        <PanelCollapseButton
          accent="emerald"
          controls="iris-inspector-panel"
          aria-label="Collapse inspector panel"
          onClick={() => setPanelOpen("right", false)}
        />
      </PanelHeader>
      <div className="p-3.5">
        {selectedEntity && (
          <button
            type="button"
            className={`mb-3 flex min-h-10 w-full items-center justify-between rounded-2xl px-3 text-left text-[0.64rem] font-medium uppercase tracking-[0.13em] ring-1 transition-[background-color,color,scale] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60 ${
              followEnabled
                ? "bg-emerald-300/[0.1] text-emerald-100/85 shadow-[0_0_18px_rgba(16,185,129,0.08)] ring-emerald-200/18"
                : "bg-white/[0.04] text-slate-400 ring-white/[0.065] hover:bg-white/[0.055] hover:text-slate-100"
            }`}
            aria-pressed={followEnabled}
            onClick={() => setFollowEnabled(!followEnabled)}
          >
            <span>Follow target</span>
            <span className="font-mono text-[0.62rem]">{followEnabled ? "ON" : "OFF"}</span>
          </button>
        )}
        {selectedEntity ? (
          <div className="rounded-2xl bg-white/[0.042] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.07]">
            <div className="pb-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.055)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.62rem] uppercase tracking-[0.17em] text-slate-500">
                    {selectedEntity.kind}
                  </p>
                  <h3 className="mt-1 break-words font-mono text-[0.84rem] leading-5 text-cyan-50">{selectedEntity.name}</h3>
                </div>
                <span className="rounded-lg bg-cyan-300/10 px-2 py-1 font-mono text-[0.56rem] uppercase tracking-[0.11em] text-cyan-100/75 ring-1 ring-cyan-200/14">
                  locked
                </span>
              </div>
            </div>
            <dl className="mt-3 space-y-2">
              {selectedEntity.metadata && selectedEntity.kind === "aircraft" ? (
                aircraftFieldOrder.map(([key, label]) => (
                  <div key={key} className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                      {label}
                    </dt>
                    <dd className="break-words text-right font-mono text-[0.7rem] tabular-nums text-slate-200/90">
                      {String(selectedEntity.metadata?.[key] ?? "--")}
                    </dd>
                  </div>
                ))
              ) : selectedEntity.metadata && selectedEntity.kind === "satellite" ? (
                satelliteFieldOrder.map(([key, label]) => (
                  <div key={key} className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                      {label}
                    </dt>
                    <dd className="break-words text-right font-mono text-[0.7rem] tabular-nums text-slate-200/90">
                      {String(selectedEntity.metadata?.[key] ?? "--")}
                    </dd>
                  </div>
                ))
              ) : selectedEntity.metadata && selectedEntity.kind === "gdelt" ? (
                gdeltFieldOrder.map(([key, label]) => (
                  <div key={key} className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                      {label}
                    </dt>
                    <dd className="break-words text-right font-mono text-[0.7rem] tabular-nums text-slate-200/90">
                      {String(selectedEntity.metadata?.[key] ?? "--")}
                    </dd>
                  </div>
                ))
              ) : selectedEntity.metadata ? (
                Object.entries(selectedEntity.metadata).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[6.5rem_1fr] gap-3">
                    <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                      {key}
                    </dt>
                    <dd className="break-words text-right font-mono text-[0.7rem] tabular-nums text-slate-200/90">
                      {String(value ?? "--")}
                    </dd>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">Type</dt>
                    <dd className="font-mono text-[0.7rem] capitalize text-slate-200/90">
                      {selectedEntity.kind}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                      Identifier
                    </dt>
                    <dd className="break-all font-mono text-[0.7rem] text-cyan-100">{selectedEntity.id}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/[0.07]">
            <div className="flex items-center gap-3 pb-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.055)]">
              <div
                className="relative grid size-10 place-items-center rounded-2xl bg-slate-900/80 ring-1 ring-white/[0.08]"
                aria-hidden="true"
              >
                <span className="size-4 rounded-full border border-slate-500/70" />
                <span className="absolute h-px w-6 bg-slate-500/50" />
                <span className="absolute h-6 w-px bg-slate-500/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">No target lock</p>
                <p className="mt-0.5 text-[0.65rem] text-slate-500">Select a live entity to inspect</p>
              </div>
            </div>
            <dl className="space-y-2.5">
              {placeholderFields.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">{label}</dt>
                  <dd className="text-right font-mono text-[0.7rem] tabular-nums text-slate-300/85">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </PanelShell>
  );
}

export default memo(InspectorPanel);
