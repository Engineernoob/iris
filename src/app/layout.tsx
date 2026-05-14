import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iris",
  description: "Spatial intelligence dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full overflow-hidden bg-[#02070a] text-slate-100">{children}</body>
    </html>
  );
}
