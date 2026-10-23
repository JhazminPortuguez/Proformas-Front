import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    // Proxy same-origin /api/* -> Laravel, evita CORS y oculta el back.
    // Cambiar por la URL pública del back al desplegar.
    const laravel = process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000";
    return [
      { source: "/api/:path*", destination: `${laravel}/api/:path*` },
      { source: "/sanctum/:path*", destination: `${laravel}/sanctum/:path*` },
    ];
  },
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
