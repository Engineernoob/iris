"use client";

import { useRef } from "react";
import "cesium/Build/Cesium/Widgets/widgets.css";

import { useAircraftLayer } from "@/hooks/useAircraftLayer";
import { useAutoRotate } from "@/hooks/useAutoRotate";
import { useCameraTelemetry } from "@/hooks/useCameraTelemetry";
import { useCesiumBase } from "@/hooks/useCesiumBase";
import { useGdeltLayer } from "@/hooks/useGdeltLayer";
import { useSatelliteLayer } from "@/hooks/useSatelliteLayer";

export default function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { viewerRef, ready } = useCesiumBase(containerRef);

  useAircraftLayer(viewerRef, ready);
  useSatelliteLayer(viewerRef, ready);
  useGdeltLayer(viewerRef, ready);
  useCameraTelemetry(viewerRef, ready);
  useAutoRotate(viewerRef, ready);

  return <div ref={containerRef} className="fixed inset-0 h-screen w-screen bg-black" />;
}
