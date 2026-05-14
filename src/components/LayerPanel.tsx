"use client";

<<<<<<< HEAD
import { memo } from "react";
=======
import { memo, useCallback } from "react";
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
import { useShallow } from "zustand/react/shallow";

import type { LayerId } from "@/store/useWorldStore";
import { useWorldStore } from "@/store/useWorldStore";

const layers: Array<{ id: LayerId; label: string; detail: string }> = [
  { id: "mapboxSatellite", label: "Mapbox Satellite", detail: "Satellite streets base layer" },
  { id: "aircraft", label: "Aircraft", detail: "ADS-B traffic overlay" },
  { id: "satellites", label: "Satellites", detail: "Orbital catalog tracks" },
  { id: "gdelt", label: "GDELT Events", detail: "Global conflict & events" },
  { id: "terrain", label: "Terrain", detail: "Elevation occlusion model" },
  { id: "hud", label: "HUD", detail: "Mission readout overlay" },
];

<<<<<<< HEAD
const panelButtonClass =
  "grid size-10 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60 active:scale-[0.96]";

export const LayerPanel = memo(function LayerPanel() {
=======
function LayerPanel() {
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
  const { activeLayers, toggleLayer, panelOpen, setPanelOpen } = useWorldStore(
    useShallow((state) => ({
      activeLayers: state.activeLayers,
      toggleLayer: state.toggleLayer,
      panelOpen: state.panels.left,
      setPanelOpen: state.setPanelOpen,
    })),
  );

  if (!panelOpen) {
    return (
      <button
        type="button"
<<<<<<< HEAD
        className="absolute left-4 top-20 z-20 min-h-11 rounded-xl bg-slate-950/60 px-3 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-slate-100 shadow-[0_16px_50px_rgba(0,0,0,0.24),0_0_30px_rgba(14,165,233,0.05)] ring-1 ring-white/[0.09] backdrop-blur-xl transition-colors hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
=======
        className="absolute left-4 top-20 z-20 flex h-10 items-center gap-2 rounded-lg bg-slate-950/70 px-3 text-[0.65rem] font-medium uppercase tracking-wider text-slate-400 transition-transform hover:bg-slate-900/80 hover:text-slate-200 active:scale-[0.96]"
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
        onClick={() => setPanelOpen("left", true)}
        aria-expanded={false}
        aria-controls="iris-layer-panel"
      >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        Layers
      </button>
    );
  }

  return (
<<<<<<< HEAD
    <aside
      id="iris-layer-panel"
      className="absolute left-3 top-20 z-20 max-h-[calc(100dvh-8.5rem)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl bg-slate-950/52 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.28),0_0_34px_rgba(14,165,233,0.05)] ring-1 ring-white/[0.09] backdrop-blur-2xl sm:left-4 sm:w-[18rem]"
      aria-labelledby="iris-layer-panel-title"
    >
      <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
=======
    <aside className="absolute left-4 top-20 z-20 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-slate-950/70 text-slate-100 shadow-xl ring-1 ring-white/[0.06] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
        <div>
          <p className="text-[0.6rem] font-medium uppercase tracking-widest text-slate-500">
            Layers
          </p>
<<<<<<< HEAD
          <h2 id="iris-layer-panel-title" className="mt-1 text-xs font-medium text-slate-200">
            Mission visibility
          </h2>
        </div>
        <button
          type="button"
          className={panelButtonClass}
=======
        </div>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-300 active:scale-[0.95]"
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
          aria-label="Collapse layer panel"
          aria-expanded={true}
          aria-controls="iris-layer-panel"
          onClick={() => setPanelOpen("left", false)}
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
      <div className="p-2">
        {layers.map((layer) => {
          const active = activeLayers[layer.id];

          return (
            <button
              key={layer.id}
              type="button"
<<<<<<< HEAD
              className="group grid min-h-12 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 active:scale-[0.99]"
=======
              className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-transform hover:bg-white/[0.04] active:scale-[0.96]"
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
              onClick={() => toggleLayer(layer.id)}
              aria-pressed={active}
              aria-label={`${active ? "Disable" : "Enable"} ${layer.label} layer`}
            >
              <span
                className={`size-2 rounded-full transition-all ${
                  active ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "bg-slate-600/70"
                }`}
                aria-hidden="true"
              />
              <span className="min-w-0">
<<<<<<< HEAD
                <span className="block truncate text-[0.8rem] font-medium text-slate-100">{layer.label}</span>
                <span className="mt-0.5 block truncate text-[0.68rem] text-slate-400/75">
                  {layer.detail}
                </span>
              </span>
              <span
                className={`h-5 w-9 rounded-full p-0.5 ring-1 transition-colors ${
                  active ? "bg-cyan-300/15 ring-cyan-200/20" : "bg-white/[0.04] ring-white/[0.08]"
                }`}
                aria-hidden="true"
              >
                <span
                  className={`block size-4 rounded-full transition-transform ${
                    active ? "translate-x-4 bg-cyan-100/90" : "translate-x-0 bg-slate-500/80"
=======
                <span className="block truncate text-sm font-medium text-slate-200">{layer.label}</span>
                <span className="mt-0.5 block truncate text-[0.65rem] tracking-wide text-slate-500">
                  {layer.detail}
                </span>
              </span>
                <div
                  className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                    active ? "bg-cyan-400/20" : "bg-white/[0.03]"
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
                  }`}
                >
                  <div
                    className={`size-5 rounded-full shadow-sm transition-transform ${
                      active ? "translate-x-5 bg-cyan-400" : "translate-x-0 bg-slate-500"
                    }`}
                  />
                </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
<<<<<<< HEAD
});
=======
}

export default memo(LayerPanel);
>>>>>>> 9bb8ea75ec4f7e2578f93f261ed746d19313b2e1
