import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las fotos ya salen optimizadas del script (WebP chico), así que no
  // gastamos la cuota gratuita de optimización de imágenes de Vercel.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
