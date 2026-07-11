import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
