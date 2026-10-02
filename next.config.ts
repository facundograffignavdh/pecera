import type { NextConfig } from "next";

// Avatares y posters que vienen de R2 (ver lib/media.ts).
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  experimental: {
    // Foto o logo de hasta 1 MB (lib/limites-imagen.ts) más el resto del form de alta.
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    remotePatterns: mediaUrl ? [new URL(`${mediaUrl}/**`)] : [],
  },
};

export default nextConfig;
