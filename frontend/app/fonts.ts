import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";

export const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const serif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});
