"use client";

import dynamic from "next/dynamic";

const MapboxGlobe = dynamic(() => import("@/components/MapboxGlobe"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[#02070a]" aria-label="Loading Iris globe" />,
});

const HudOverlay = dynamic(() => import("@/components/HudOverlay"), {
  ssr: false,
});

const TopBar = dynamic(() => import("@/components/TopBar"), {
  ssr: false,
});

const LayerPanel = dynamic(() => import("@/components/LayerPanel"), {
  ssr: false,
});

const EntityTooltip = dynamic(() => import("@/components/EntityTooltip"), {
  ssr: false,
});

const BottomTicker = dynamic(() => import("@/components/BottomTicker"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-[#02070a]">
      <MapboxGlobe />
      <HudOverlay />
      <TopBar />
      <LayerPanel />
      <EntityTooltip />
      <BottomTicker />
    </main>
  );
}
