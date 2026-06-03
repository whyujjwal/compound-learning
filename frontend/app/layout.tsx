import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { ShellGate } from "@/components/ui/ShellGate";
import { QueryProvider } from "@/lib/query/client";
import { sans, mono, serif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "compound",
  description: "A focused learning workspace where small study blocks compound into durable mastery.",
  icons: {
    icon: "/compound-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07070a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`} suppressHydrationWarning>
      <body>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <ThemeProvider>
          <ToastProvider>
            <QueryProvider>
              <ShellGate>{children}</ShellGate>
            </QueryProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
