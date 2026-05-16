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
  cyan: "shadow-[0_14px_46px_rgba(0,0,0,0.26),0_0_24px_rgba(14,165,233,0.05)]",
  emerald: "shadow-[0_14px_46px_rgba(0,0,0,0.26),0_0_24px_rgba(16,185,129,0.05)]",
};

const panelShadow: Record<Accent, string> = {
  cyan: "shadow-[0_22px_80px_rgba(0,0,0,0.34),0_0_42px_rgba(14,165,233,0.07)]",
  emerald: "shadow-[0_22px_80px_rgba(0,0,0,0.34),0_0_42px_rgba(16,185,129,0.07)]",
};

const panelPosition: Record<PanelSide, string> = {
  left: "left-3 top-20 sm:left-5",
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
      className={`absolute ${side}-5 top-20 z-20 grid size-11 place-items-center rounded-2xl bg-slate-950/62 text-slate-200 ${openShadow[accent]} ring-1 ring-white/[0.1] backdrop-blur-2xl transition-[background-color,color,scale] hover:bg-slate-900/78 hover:text-white focus-visible:outline-none focus-visible:ring-2 ${openFocusRing[accent]} active:scale-[0.96] ${className}`}
      aria-expanded={false}
      aria-controls={controls}
      {...props}
    >
      {icon}
      <span className="sr-only">{children}</span>
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
      className={`absolute ${panelPosition[side]} z-20 max-h-[calc(100dvh-8.5rem)] ${widthClassName} overflow-y-auto rounded-2xl bg-slate-950/72 text-slate-100 ${panelShadow[accent]} ring-1 ring-white/[0.1] backdrop-blur-2xl`}
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
    <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5 shadow-[inset_0_-1px_0_rgba(255,255,255,0.055)]">
      <div>
        <p className="text-[0.6rem] font-medium uppercase tracking-widest text-slate-500">
          {eyebrow}
        </p>
        <h2 id={titleId} className="mt-1 text-[0.82rem] font-medium text-slate-100">
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
      className={`grid size-10 place-items-center rounded-xl text-slate-400 transition-[background-color,color,scale] hover:bg-white/[0.06] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 ${collapseFocusRing[accent]} active:scale-[0.96] ${className}`}
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
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 font-mono text-[0.6rem] uppercase tracking-[0.095em] text-slate-300/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ring-1 ring-white/[0.06]">
      <StatusDot active={active} size="xs" glow />
      {label}
    </span>
  );
}
