"use client";

import dynamic from "next/dynamic";

import { BottomTicker } from "@/components/BottomTicker";
import { HudOverlay } from "@/components/HudOverlay";
import { InspectorPanel } from "@/components/InspectorPanel";
import { LayerPanel } from "@/components/LayerPanel";
import { TopBar } from "@/components/TopBar";

const CesiumViewer = dynamic(() => import("@/components/CesiumViewer"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black" />,
});

export default function Home() {
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
