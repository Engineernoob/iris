"use client";

import { memo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import type { LayerId } from "@/store/useWorldStore";
import { useWorldStore } from "@/store/useWorldStore";

const layers: Array<{ id: LayerId; label: string; detail: string }> = [
  { id: "mapboxSatellite", label: "Mapbox Satellite", detail: "Satellite streets base layer" },
  { id: "aircraft", label: "Aircraft", detail: "ADS-B traffic overlay" },
  { id: "satellites", label: "Satellites", detail: "Orbital catalog tracks" },
  { id: "terrain", label: "Terrain", detail: "Elevation occlusion model" },
  { id: "hud", label: "HUD", detail: "Mission readout overlay" },
];

function LayerPanel() {
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
        className="absolute left-4 top-20 z-20 flex h-10 items-center gap-2 rounded-lg bg-slate-950/70 px-3 text-[0.65rem] font-medium uppercase tracking-wider text-slate-400 transition-all hover:bg-slate-900/80 hover:text-slate-200 active:scale-[0.97]"
        onClick={() => setPanelOpen("left", true)}
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Layers
      </button>
    );
  }

  return (
    <aside className="absolute left-4 top-20 z-20 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-slate-950/70 text-slate-100 shadow-xl ring-1 ring-white/[0.06] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
        <div>
          <p className="text-[0.6rem] font-medium uppercase tracking-widest text-slate-500">
            Layers
          </p>
        </div>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-300 active:scale-[0.95]"
          aria-label="Collapse layer panel"
          onClick={() => setPanelOpen("left", false)}
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-2">
        {layers.map((layer) => {
          const active = activeLayers[layer.id];

          return (
            <button
              key={layer.id}
              type="button"
              className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-all hover:bg-white/[0.04] active:scale-[0.98]"
              onClick={() => toggleLayer(layer.id)}
              aria-pressed={active}
            >
              <span
                className={`size-2 rounded-full transition-all ${
                  active ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "bg-slate-600/70"
                }`}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-200">{layer.label}</span>
                <span className="mt-0.5 block truncate text-[0.65rem] tracking-wide text-slate-500">
                  {layer.detail}
                </span>
              </span>
              <div
                className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                  active ? "bg-cyan-400/20" : "bg-white/[0.03]"
                }`}
              >
                <div
                  className={`size-5 rounded-full shadow-sm transition-all ${
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
}

export default memo(LayerPanel);
