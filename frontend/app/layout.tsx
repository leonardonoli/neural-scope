import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neural Scope — Transformer Visualizer",
  description:  "Watch a transformer think in real time. Attention, probabilities, tokens — all live.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ height: "100%", overflow: "hidden" }} suppressHydrationWarning>{children}</body>
    </html>
  );
}
