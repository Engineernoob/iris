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
        className="absolute left-4 top-20 z-20 min-h-10 rounded-xl bg-slate-950/55 px-3 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-slate-200 shadow-[0_0_34px_rgba(14,165,233,0.08)] ring-1 ring-white/[0.08] backdrop-blur-xl transition-colors hover:bg-slate-900/70"
        onClick={() => setPanelOpen("left", true)}
      >
        Layers
      </button>
    );
  }

  return (
    <aside className="absolute left-4 top-20 z-20 w-[min(18rem,calc(100vw-2rem))] rounded-2xl bg-slate-950/48 text-slate-100 shadow-[0_0_40px_rgba(14,165,233,0.07),0_20px_70px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.08] backdrop-blur-2xl">
      <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
        <div>
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-slate-500">
            Operational Layers
          </p>
          <h2 className="mt-1 text-xs font-medium text-slate-200">Mission visibility</h2>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-200 active:scale-[0.96]"
          aria-label="Collapse layer panel"
          onClick={() => setPanelOpen("left", false)}
        >
          -
        </button>
      </div>
      <div className="px-2 pb-2.5">
        {layers.map((layer) => {
          const active = activeLayers[layer.id];

          return (
            <button
              key={layer.id}
              type="button"
              className="group grid min-h-12 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.045] active:scale-[0.99]"
              onClick={() => toggleLayer(layer.id)}
              aria-pressed={active}
            >
              <span
                className={`size-1.5 rounded-full ${
                  active ? "bg-emerald-300/80 shadow-[0_0_12px_rgba(110,231,183,0.35)]" : "bg-slate-600/70"
                }`}
              />
              <span className="min-w-0">
                <span className="block truncate text-[0.78rem] font-medium text-slate-100">{layer.label}</span>
                <span className="mt-0.5 block truncate text-[0.66rem] text-slate-500">
                  {layer.detail}
                </span>
              </span>
              <span
                className={`h-5 w-9 rounded-full p-0.5 ring-1 transition-colors ${
                  active ? "bg-cyan-300/15 ring-cyan-200/20" : "bg-white/[0.04] ring-white/[0.08]"
                }`}
              >
                <span
                  className={`block size-4 rounded-full transition-transform ${
                    active ? "translate-x-4 bg-cyan-100/90" : "translate-x-0 bg-slate-500/80"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default memo(LayerPanel);
