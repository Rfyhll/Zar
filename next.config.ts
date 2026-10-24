import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" hanya untuk self-hosting (Render/VPS/lokal).
  // Di Vercel output standalone dimatikan — Vercel punya sistem build sendiri.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
