import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/primitives/Toast";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ShellGate } from "@/components/shell";
import { sans, mono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compound",
  description: "A focused learning workspace where small study blocks compound into durable mastery.",
  icons: {
    icon: "/compound-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/*
          theme-init.js runs before React hydration to set data-theme on <html>,
          preventing flash of wrong colors. Uses beforeInteractive strategy.
        */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />

        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              <ShellGate>{children}</ShellGate>
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
