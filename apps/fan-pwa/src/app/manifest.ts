import type { MetadataRoute } from "next";

/** Return the PWA web-app manifest served at /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PULSE — Stadium Concierge",
    short_name: "PULSE",
    description:
      "Voice-native stadium concierge for the 2026 IPL final. Ask anything.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0D14",
    theme_color: "#00E5FF",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
