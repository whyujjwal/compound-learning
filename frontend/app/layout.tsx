import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { HelpOverlay } from "@/components/HelpOverlay";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compound — Adaptive Learning Platform",
  description: "FSRS-powered spaced repetition for DSA, AI, and system design",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="app-shell">
            <Nav />
            <main>{children}</main>
          </div>
          <HelpOverlay />
        </ToastProvider>
      </body>
    </html>
  );
}
