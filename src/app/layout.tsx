import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

// Two families, as in an editorial print layout: a tight grotesk for titles and labels,
// an italic serif for taglines and body copy.
const display = Inter_Tight({ subsets: ["latin"], variable: "--font-display-face", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif-face", display: "swap" });

export const metadata: Metadata = {
  title: "Arpit Ray — Software Engineer",
  description: "Software Engineer working on data, machine learning and the products they power.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable}`}>
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
