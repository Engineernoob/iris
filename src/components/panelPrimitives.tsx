import type { ButtonHTMLAttributes, ReactNode } from "react";

type Accent = "cyan" | "emerald";
type PanelSide = "left" | "right";

const collapseFocusRing: Record<Accent, string> = {
  cyan: "focus-visible:ring-cyan-200/60",
  emerald: "focus-visible:ring-emerald-200/60",
};

const openFocusRing: Record<Accent, string> = {
  cyan: "focus-visible:ring-cyan-200/60",
  emerald: "focus-visible:ring-emerald-200/60",
};

const openShadow: Record<Accent, string> = {
  cyan: "shadow-[0_16px_50px_rgba(0,0,0,0.24),0_0_30px_rgba(14,165,233,0.05)]",
  emerald: "shadow-[0_16px_50px_rgba(0,0,0,0.24),0_0_30px_rgba(16,185,129,0.05)]",
};

const panelShadow: Record<Accent, string> = {
  cyan: "shadow-[0_20px_70px_rgba(0,0,0,0.28),0_0_34px_rgba(14,165,233,0.05)]",
  emerald: "shadow-[0_20px_70px_rgba(0,0,0,0.28),0_0_34px_rgba(16,185,129,0.05)]",
};

const panelPosition: Record<PanelSide, string> = {
  left: "left-3 top-20 sm:left-4",
  right: "right-3 top-[22rem] sm:right-4 lg:top-20",
};

type OpenPanelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  accent: Accent;
  side: PanelSide;
  controls: string;
  icon: ReactNode;
  children: ReactNode;
};

export function OpenPanelButton({
  accent,
  side,
  controls,
  icon,
  children,
  className = "",
  ...props
}: OpenPanelButtonProps) {
  return (
    <button
      type="button"
      className={`absolute ${side}-4 top-20 z-20 flex min-h-11 items-center gap-2 rounded-xl bg-slate-950/60 px-3 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-slate-100 ${openShadow[accent]} ring-1 ring-white/[0.09] backdrop-blur-xl transition-colors hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 ${openFocusRing[accent]} ${className}`}
      aria-expanded={false}
      aria-controls={controls}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

type PanelShellProps = {
  id: string;
  labelledBy: string;
  accent: Accent;
  side: PanelSide;
  widthClassName: string;
  children: ReactNode;
};

export function PanelShell({
  id,
  labelledBy,
  accent,
  side,
  widthClassName,
  children,
}: PanelShellProps) {
  return (
    <aside
      id={id}
      className={`absolute ${panelPosition[side]} z-20 max-h-[calc(100dvh-8.5rem)] ${widthClassName} overflow-y-auto rounded-2xl bg-slate-950/52 text-slate-100 ${panelShadow[accent]} ring-1 ring-white/[0.09] backdrop-blur-2xl`}
      aria-labelledby={labelledBy}
    >
      {children}
    </aside>
  );
}

type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  titleId: string;
  children: ReactNode;
};

export function PanelHeader({ eyebrow, title, titleId, children }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
      <div>
        <p className="text-[0.6rem] font-medium uppercase tracking-widest text-slate-500">
          {eyebrow}
        </p>
        <h2 id={titleId} className="mt-1 text-xs font-medium text-slate-200">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

type PanelCollapseButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  accent: Accent;
  controls: string;
};

export function PanelCollapseButton({
  accent,
  controls,
  className = "",
  ...props
}: PanelCollapseButtonProps) {
  return (
    <button
      type="button"
      className={`grid size-10 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 ${collapseFocusRing[accent]} active:scale-[0.96] ${className}`}
      aria-expanded={true}
      aria-controls={controls}
      {...props}
    >
      <span aria-hidden="true">-</span>
    </button>
  );
}

type StatusDotProps = {
  active: boolean;
  tone?: "cyan" | "emerald" | "violet";
  size?: "xs" | "sm";
  glow?: boolean;
};

export function StatusDot({ active, tone = "emerald", size = "sm", glow = false }: StatusDotProps) {
  const activeClass = {
    cyan: "bg-cyan-400",
    emerald: "bg-emerald-300/75",
    violet: "bg-violet-400",
  }[tone];
  const glowClass = active && glow ? "shadow-[0_0_10px_rgba(110,231,183,0.35)]" : "";
  const sizeClass = size === "xs" ? "size-1" : "size-1.5";

  return (
    <span
      className={`${sizeClass} rounded-full ${active ? activeClass : "bg-slate-600"} ${glowClass}`}
      aria-hidden="true"
    />
  );
}

type TelemetryPillProps = {
  label: string;
  active: boolean;
};

export function TelemetryPill({ label, active }: TelemetryPillProps) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-2 rounded-full bg-white/[0.045] px-2.5 font-mono text-[0.65rem] uppercase tracking-[0.11em] text-slate-300/85 ring-1 ring-white/[0.07]">
      <StatusDot active={active} size="xs" glow />
      {label}
    </span>
  );
}
