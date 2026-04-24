"use client";

import dynamic from "next/dynamic";

import { BottomTicker } from "@/components/BottomTicker";
import { HudOverlay } from "@/components/HudOverlay";
import { InspectorPanel } from "@/components/InspectorPanel";
import { LayerPanel } from "@/components/LayerPanel";
import { TopBar } from "@/components/TopBar";

const CesiumViewer = dynamic(
  () => import("@/components/CesiumViewer").then((module) => module.CesiumViewer),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-black" />,
  },
);

export function DashboardShell() {
  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-black">
      <CesiumViewer />
      <HudOverlay />
      <TopBar />
      <LayerPanel />
      <InspectorPanel />
      <BottomTicker />
    </main>
  );
}
