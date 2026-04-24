"use client";

import dynamic from "next/dynamic";

const CesiumViewer = dynamic(() => import("@/components/CesiumViewer"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black" />,
});

export default function Home() {
  return <CesiumViewer />;
}
