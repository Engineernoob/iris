"use client";

import { memo } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  OpenPanelButton,
  PanelCollapseButton,
  PanelHeader,
  PanelShell,
  StatusDot,
} from "@/components/panelPrimitives";
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
      <OpenPanelButton
        accent="cyan"
        side="left"
        controls="iris-layer-panel"
        icon={
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        }
        onClick={() => setPanelOpen("left", true)}
      >
        Layers
      </OpenPanelButton>
    );
  }

  return (
    <PanelShell
      id="iris-layer-panel"
      labelledBy="iris-layer-panel-title"
      accent="cyan"
      side="left"
      widthClassName="w-[min(18rem,calc(100vw-1.5rem))] sm:w-[18rem]"
    >
      <PanelHeader eyebrow="Layers" title="Mission visibility" titleId="iris-layer-panel-title">
        <PanelCollapseButton
          accent="cyan"
          controls="iris-layer-panel"
          aria-label="Collapse layer panel"
          onClick={() => setPanelOpen("left", false)}
        />
      </PanelHeader>
      <div className="p-2">
        {layers.map((layer) => {
          const active = activeLayers[layer.id];

          return (
            <button
              key={layer.id}
              type="button"
              className="group grid min-h-12 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 active:scale-[0.99]"
              onClick={() => toggleLayer(layer.id)}
              aria-pressed={active}
              aria-label={`${active ? "Disable" : "Enable"} ${layer.label} layer`}
            >
              <StatusDot active={active} tone="cyan" />
              <span className="min-w-0">
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
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </PanelShell>
  );
}

export default memo(LayerPanel);
