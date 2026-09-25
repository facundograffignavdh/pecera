import type { NextConfig } from "next";

// Avatares y posters que vienen de R2 (ver lib/media.ts).
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: mediaUrl ? [new URL(`${mediaUrl}/**`)] : [],
  },
};

export default nextConfig;
