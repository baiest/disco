import type { MetadataRoute } from "next";

/** Lets the owner add the admin to the phone's home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Disco",
    short_name: "Disco",
    description: "Catálogo de discos",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#b8420f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
