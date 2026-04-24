const tickerItems = [
  "Telemetry bus initialized",
  "Awaiting live aircraft feed",
  "Satellite pass prediction standby",
  "Mapbox imagery layer active",
];

export function BottomTicker() {
  return (
    <footer className="absolute inset-x-0 bottom-0 z-30 border-t border-cyan-300/15 bg-slate-950/70 text-slate-300 backdrop-blur-xl">
      <div className="flex min-h-12 items-center gap-4 overflow-hidden px-4 sm:px-6">
        <div className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-cyan-200">
          Live Events
        </div>
        <div className="h-5 w-px shrink-0 bg-cyan-300/20" />
        <div className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden whitespace-nowrap text-xs uppercase tracking-[0.18em] text-slate-400">
          {tickerItems.map((item) => (
            <span key={item} className="inline-flex items-center gap-3">
              <span className="size-1.5 bg-emerald-300/80" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
