export function TopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-30 border-b border-cyan-300/15 bg-slate-950/70 text-slate-100 shadow-[0_10px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 place-items-center border border-cyan-300/40 bg-cyan-300/10 text-sm font-black tracking-widest text-cyan-100">
            IR
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold uppercase tracking-[0.34em] text-white">Iris</h1>
            <p className="hidden text-[0.62rem] uppercase tracking-[0.24em] text-cyan-200/70 sm:block">
              Spatial Intelligence Console
            </p>
          </div>
        </div>
        <div className="mx-auto hidden w-full max-w-xl items-center border border-slate-700/70 bg-black/30 px-3 py-2 md:flex">
          <span className="mr-3 h-2 w-2 bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
          <input
            className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
            placeholder="Search coordinates, callsign, NORAD ID"
            aria-label="Search"
          />
        </div>
        <div className="ml-auto flex items-center gap-2 border border-emerald-300/20 bg-emerald-400/10 px-3 py-2">
          <span className="size-2 bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" />
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-emerald-100">
            Online
          </span>
        </div>
      </div>
    </header>
  );
}
