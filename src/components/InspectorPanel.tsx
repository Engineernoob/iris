"use client";

import { useWorldStore } from "@/store/useWorldStore";

export function InspectorPanel() {
  const selectedEntity = useWorldStore((state) => state.selectedEntity);
  const panelOpen = useWorldStore((state) => state.panels.right);
  const setPanelOpen = useWorldStore((state) => state.setPanelOpen);

  if (!panelOpen) {
    return (
      <button
        type="button"
        className="absolute right-4 top-24 z-20 border border-emerald-300/30 bg-black/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.12)] backdrop-blur-md transition hover:border-emerald-200/60"
        onClick={() => setPanelOpen("right", true)}
      >
        Inspector
      </button>
    );
  }

  return (
    <aside className="absolute right-4 top-24 z-20 w-[min(21rem,calc(100vw-2rem))] border border-emerald-300/20 bg-slate-950/70 text-slate-100 shadow-[0_0_36px_rgba(16,185,129,0.12)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-emerald-300/15 px-4 py-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-emerald-200/80">
            Inspector
          </p>
          <h2 className="mt-1 text-sm font-semibold text-white">Selected Entity</h2>
        </div>
        <button
          type="button"
          className="grid size-8 place-items-center border border-slate-600/70 text-slate-300 transition hover:border-emerald-300/60 hover:text-emerald-100"
          aria-label="Collapse inspector panel"
          onClick={() => setPanelOpen("right", false)}
        >
          -
        </button>
      </div>
      <div className="p-4">
        {selectedEntity ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Name</dt>
              <dd className="mt-1 text-slate-100">{selectedEntity.name}</dd>
            </div>
            <div>
              <dt className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Type</dt>
              <dd className="mt-1 capitalize text-slate-100">{selectedEntity.kind}</dd>
            </div>
            <div>
              <dt className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Identifier</dt>
              <dd className="mt-1 font-mono text-cyan-100">{selectedEntity.id}</dd>
            </div>
          </dl>
        ) : (
          <div className="min-h-44 border border-dashed border-slate-700/80 bg-black/20 p-4">
            <p className="text-sm text-slate-300">No entity selected</p>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              Aircraft, satellite, terrain, and alert metadata will appear here when live layers are connected.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
