import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://poletopaddock.com";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pole to Paddock — F1 Silly Season Tracker",
    template: "%s — Pole to Paddock",
  },
  description:
    "Track every F1 driver contract, seat swap, and rumor for the 2026 season. Live race data, telemetry analysis, and full race schedule.",
  applicationName: "Pole to Paddock",
  referrer: "origin-when-cross-origin",
  keywords: [
    "F1",
    "Formula 1",
    "silly season",
    "driver transfers",
    "2026 F1 season",
    "F1 contracts",
    "live race data",
    "F1 telemetry",
    "race schedule",
    "pit stops",
    "lap times",
  ],
  authors: [{ name: "Pole to Paddock" }],
  creator: "Pole to Paddock",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Pole to Paddock",
    title: "Pole to Paddock — F1 Silly Season Tracker",
    description:
      "Track every F1 driver contract, seat swap, and rumor for the 2026 season. Live race data, telemetry analysis, and full race schedule.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Pole to Paddock — F1 Silly Season Tracker",
    description:
      "Track every F1 driver contract, seat swap, and rumor for the 2026 season.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${spaceMono.variable} antialiased min-h-screen bg-[#0a0a0a] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
