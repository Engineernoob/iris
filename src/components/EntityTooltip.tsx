"use client";

import { memo, useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useWorldStore } from "@/store/useWorldStore";

function EntityTooltip() {
  const { hoveredEntity, hoverPosition } = useWorldStore(
    useShallow((state) => ({
      hoveredEntity: state.hoveredEntity,
      hoverPosition: state.hoverPosition,
    })),
  );

  const handleClick = useCallback(() => {
    if (hoveredEntity) {
      useWorldStore.getState().setSelectedEntity(hoveredEntity);
    }
  }, [hoveredEntity]);

  const tooltipStyle = useMemo(() => {
    if (!hoverPosition) return undefined;
    const offsetX = 16;
    const offsetY = 16;
    return {
      left: `${hoverPosition.x + offsetX}px`,
      top: `${hoverPosition.y + offsetY}px`,
    };
  }, [hoverPosition]);

  if (!hoveredEntity || !hoverPosition) {
    return null;
  }

  const { name, kind, metadata } = hoveredEntity;

  const getKindColor = (kind: string) => {
    switch (kind) {
      case "aircraft":
        return "text-cyan-400";
      case "satellite":
        return "text-emerald-400";
      case "gdelt":
        return "text-amber-400";
      default:
        return "text-slate-400";
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case "aircraft":
        return "Aircraft";
      case "satellite":
        return "Satellite";
      case "gdelt":
        return "Event";
      default:
        return kind;
    }
  };

  const getPrimaryFields = (): [string, string | number | null][] => {
    if (!metadata) return [];
    const result: [string, string | number | null][] = [];
    switch (kind) {
      case "aircraft":
        if (metadata["callsign"] != null && metadata["callsign"] !== "--") result.push(["Callsign", metadata["callsign"] as string | number | null]);
        if (metadata["ICAO24"] != null && metadata["ICAO24"] !== "--") result.push(["ICAO24", metadata["ICAO24"] as string | number | null]);
        if (metadata["altitude"] != null && metadata["altitude"] !== "--") result.push(["Altitude", metadata["altitude"] as string | number | null]);
        if (metadata["country"] != null && metadata["country"] !== "--") result.push(["Country", metadata["country"] as string | number | null]);
        return result;
      case "satellite":
        if (metadata["Name"] != null && metadata["Name"] !== "--") result.push(["Name", metadata["Name"] as string | number | null]);
        if (metadata["NORAD"] != null && metadata["NORAD"] !== "--") result.push(["NORAD ID", metadata["NORAD"] as string | number | null]);
        if (metadata["Altitude"] != null && metadata["Altitude"] !== "--") result.push(["Altitude", metadata["Altitude"] as string | number | null]);
        return result;
      case "gdelt":
        if (metadata["Actor 1"] != null && metadata["Actor 1"] !== "--") result.push(["Actor 1", metadata["Actor 1"] as string | number | null]);
        if (metadata["Actor 2"] != null && metadata["Actor 2"] !== "--") result.push(["Actor 2", metadata["Actor 2"] as string | number | null]);
        if (metadata["Event Code"] != null && metadata["Event Code"] !== "--") result.push(["Event", metadata["Event Code"] as string | number | null]);
        if (metadata["Latitude"] && metadata["Longitude"]) result.push(["Location", `${metadata["Latitude"]}, ${metadata["Longitude"]}`]);
        return result;
      default:
        return [];
    }
  };

  const fields = getPrimaryFields();

  return (
    <div
      className="fixed z-50 max-w-xs pointer-events-none"
      style={tooltipStyle}
      onClick={handleClick}
    >
      <div className="rounded-lg bg-slate-950/85 text-slate-100 shadow-xl ring-1 ring-white/[0.08] backdrop-blur-xl transition-transform">
        <div className="border-b border-white/[0.05] px-3 py-2">
          <p className={`text-[0.6rem] font-medium uppercase tracking-widest ${getKindColor(kind)}`}>
            {getKindLabel(kind)}
          </p>
          <h3 className="mt-0.5 font-mono text-sm font-medium text-slate-100 truncate">
            {name}
          </h3>
        </div>
        {fields.length > 0 && (
          <dl className="px-3 py-2 space-y-1.5">
            {fields.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <dt className="text-[0.6rem] uppercase tracking-wider text-slate-500 shrink-0">
                  {label}
                </dt>
                <dd className="text-right font-mono text-[0.65rem] tabular-nums text-slate-300 truncate">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

export default memo(EntityTooltip);
