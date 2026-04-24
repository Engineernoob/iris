"use client";

import type { LayerId } from "@/store/useWorldStore";
import { useWorldStore } from "@/store/useWorldStore";

const layers: Array<{ id: LayerId; label: string; detail: string }> = [
  { id: "mapboxSatellite", label: "Mapbox Satellite", detail: "Base imagery" },
  { id: "aircraft", label: "Aircraft", detail: "Live traffic layer" },
  { id: "satellites", label: "Satellites", detail: "Orbital tracks" },
  { id: "terrain", label: "Terrain", detail: "Elevation depth" },
  { id: "hud", label: "HUD", detail: "Tactical overlay" },
];

export function LayerPanel() {
  const activeLayers = useWorldStore((state) => state.activeLayers);
  const toggleLayer = useWorldStore((state) => state.toggleLayer);
  const panelOpen = useWorldStore((state) => state.panels.left);
  const setPanelOpen = useWorldStore((state) => state.setPanelOpen);

  if (!panelOpen) {
    return (
      <button
        type="button"
        className="absolute left-4 top-24 z-20 border border-cyan-300/30 bg-black/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)] backdrop-blur-md transition hover:border-cyan-200/60"
        onClick={() => setPanelOpen("left", true)}
      >
        Layers
      </button>
    );
  }

  return (
    <aside className="absolute left-4 top-24 z-20 w-[min(20rem,calc(100vw-2rem))] border border-cyan-300/20 bg-slate-950/70 text-slate-100 shadow-[0_0_36px_rgba(8,145,178,0.12)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-cyan-300/15 px-4 py-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-cyan-200/80">
            Layer Control
          </p>
          <h2 className="mt-1 text-sm font-semibold text-white">World Layers</h2>
        </div>
        <button
          type="button"
          className="grid size-8 place-items-center border border-slate-600/70 text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100"
          aria-label="Collapse layer panel"
          onClick={() => setPanelOpen("left", false)}
        >
          -
        </button>
      </div>
      <div className="space-y-2 p-3">
        {layers.map((layer) => {
          const active = activeLayers[layer.id];

          return (
            <button
              key={layer.id}
              type="button"
              className="flex w-full items-center justify-between border border-slate-700/70 bg-slate-950/60 px-3 py-3 text-left transition hover:border-cyan-300/40 hover:bg-cyan-950/20"
              onClick={() => toggleLayer(layer.id)}
              aria-pressed={active}
            >
              <span>
                <span className="block text-sm font-medium text-slate-100">{layer.label}</span>
                <span className="mt-0.5 block text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">
                  {layer.detail}
                </span>
              </span>
              <span
                className={`h-5 w-10 border p-0.5 transition ${
                  active ? "border-emerald-300/70 bg-emerald-400/20" : "border-slate-600 bg-slate-900"
                }`}
              >
                <span
                  className={`block size-3.5 bg-current transition ${
                    active ? "translate-x-5 text-emerald-300" : "translate-x-0 text-slate-600"
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
