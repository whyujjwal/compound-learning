import { Geist, Geist_Mono } from "next/font/google";

export const sans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-var",
  weight: ["300", "400", "500", "600", "700"],
});

export const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-var",
  weight: ["400", "500", "600"],
});
