import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pole to Paddock — F1 Silly Season Tracker",
    short_name: "Pole to Paddock",
    description:
      "Track every F1 driver contract, seat swap, and rumor for the 2026 season.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32",
        type: "image/x-icon",
      },
    ],
  };
}
