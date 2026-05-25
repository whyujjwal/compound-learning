import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/Toast";
import { ShellGate } from "@/components/ui/ShellGate";
import { sans, mono, serif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compound — Learning Companion",
  description: "FSRS-powered spaced-repetition workspace for DSA, AI, ML, and System Design",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07070a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <ToastProvider>
          <ShellGate>{children}</ShellGate>
        </ToastProvider>
      </body>
    </html>
  );
}
