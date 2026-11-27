import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" hanya untuk self-hosting (Render/VPS/lokal).
  // Di Vercel output standalone dimatikan — Vercel punya sistem build sendiri.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // HTML utama JANGAN di-cache browser: setelah deploy baru, HP yang menyimpan
  // HTML lama akan memuat file JS lama yang sudah dihapus -> halaman gagal
  // dibuka ("This page couldn't load"). Dengan no-store, setiap buka situs
  // selalu dapat HTML terbaru yang cocok dengan deploy terakhir.
  async headers() {
    return [
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
