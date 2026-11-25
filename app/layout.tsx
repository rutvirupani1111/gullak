import type { Metadata, Viewport } from "next";
import { Modak, Eczar, Anek_Devanagari, Dekko, Space_Mono } from "next/font/google";
import "./globals.css";

const display = Modak({ weight: "400", subsets: ["latin", "devanagari"], variable: "--f-display", display: "swap" });
const serif = Eczar({ weight: ["500", "700"], subsets: ["latin", "devanagari"], variable: "--f-serif", display: "swap", preload: false });
const body = Anek_Devanagari({ weight: ["400", "600", "800"], subsets: ["latin", "devanagari"], variable: "--f-body", display: "swap" });
const chalk = Dekko({ weight: "400", subsets: ["latin", "devanagari"], variable: "--f-chalk", display: "swap", preload: false });
const mono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--f-mono", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Gullak: dukaan ka khel, counter ka thappa",
  description: "Scan the QR at a tapri, open the matchbox, play a sealed 10-second game, and keep the coupon in a clay gullak on your phone.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#D7261E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" className={`${display.variable} ${serif.variable} ${body.variable} ${chalk.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
