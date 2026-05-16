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
import type { LayerId, SensorMode } from "@/store/useWorldStore";
import { useWorldStore } from "@/store/useWorldStore";

const layers: Array<{ id: LayerId; label: string; detail: string }> = [
  { id: "mapboxSatellite", label: "Mapbox Satellite", detail: "Satellite streets base layer" },
  { id: "aircraft", label: "Aircraft", detail: "ADS-B traffic overlay" },
  { id: "satellites", label: "Satellites", detail: "Orbital catalog tracks" },
  { id: "earthquakes", label: "Earthquakes", detail: "USGS M2.5+ daily feed" },
  { id: "maritime", label: "Maritime AIS", detail: "NOAA vessel density tiles" },
  { id: "gdelt", label: "GDELT Events", detail: "Global conflict & events" },
  { id: "humanitarian", label: "ReliefWeb", detail: "Disaster and crisis reports" },
  { id: "boundaries", label: "Boundaries", detail: "Admin context overlay" },
  { id: "imagery", label: "Imagery Tasking", detail: "NASA HLS footprints" },
  { id: "terrain", label: "Terrain", detail: "Elevation occlusion model" },
  { id: "hud", label: "HUD", detail: "Mission readout overlay" },
];

const sensorModes: Array<{ id: SensorMode; label: string }> = [
  { id: "normal", label: "Normal" },
  { id: "analyst", label: "Analyst" },
  { id: "nvg", label: "NVG" },
  { id: "thermal", label: "Thermal" },
  { id: "crt", label: "CRT" },
];

const layerTone: Record<LayerId, "cyan" | "emerald" | "violet"> = {
  mapboxSatellite: "cyan",
  aircraft: "cyan",
  satellites: "emerald",
  earthquakes: "emerald",
  maritime: "cyan",
  gdelt: "violet",
  humanitarian: "violet",
  boundaries: "cyan",
  imagery: "emerald",
  terrain: "emerald",
  hud: "cyan",
};

function LayerPanel() {
  const { activeLayers, sensorMode, setSensorMode, toggleLayer, panelOpen, setPanelOpen } = useWorldStore(
    useShallow((state) => ({
      activeLayers: state.activeLayers,
      sensorMode: state.sensorMode,
      setSensorMode: state.setSensorMode,
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
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
      widthClassName="w-[min(18.5rem,calc(100vw-1.5rem))] sm:w-[18.5rem]"
    >
      <PanelHeader eyebrow="Layers" title="Mission visibility" titleId="iris-layer-panel-title">
        <PanelCollapseButton
          accent="cyan"
          controls="iris-layer-panel"
          aria-label="Collapse layer panel"
          onClick={() => setPanelOpen("left", false)}
        />
      </PanelHeader>
      <div className="p-2.5">
        <div className="px-1.5 pb-1.5 text-[0.58rem] font-medium uppercase tracking-[0.17em] text-slate-500">
          Sensor profile
        </div>
        <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-white/[0.04] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-white/[0.065]">
          {sensorModes.map((mode) => {
            const active = sensorMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                className={`min-h-9 rounded-xl px-2 text-[0.62rem] font-medium uppercase tracking-[0.12em] transition-[background-color,color,scale] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 ${
                  active
                    ? "bg-cyan-300/14 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.08)] ring-1 ring-cyan-200/18"
                    : "text-slate-400 hover:bg-white/[0.055] hover:text-slate-100"
                }`}
                aria-pressed={active}
                onClick={() => setSensorMode(mode.id)}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
        <div className="px-1.5 pb-1.5 text-[0.58rem] font-medium uppercase tracking-[0.17em] text-slate-500">
          Feeds and overlays
        </div>
        <div className="space-y-1">
        {layers.map((layer) => {
          const active = activeLayers[layer.id];

          return (
            <button
              key={layer.id}
              type="button"
              className={`group grid min-h-12 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-[background-color,scale] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 active:scale-[0.96] ${
                active ? "bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]" : "hover:bg-white/[0.045]"
              }`}
              onClick={() => toggleLayer(layer.id)}
              aria-pressed={active}
              aria-label={`${active ? "Disable" : "Enable"} ${layer.label} layer`}
            >
              <StatusDot active={active} tone={layerTone[layer.id]} glow />
              <span className="min-w-0">
                <span className="block truncate text-[0.78rem] font-medium text-slate-100">{layer.label}</span>
                <span className="mt-0.5 block truncate text-[0.68rem] text-slate-400/75">
                  {layer.detail}
                </span>
              </span>
              <span
                className={`h-5 w-9 rounded-full p-0.5 ring-1 transition-colors ${
                  active ? "bg-cyan-300/16 ring-cyan-200/20" : "bg-white/[0.035] ring-white/[0.08]"
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
      </div>
    </PanelShell>
  );
}

export default memo(LayerPanel);
