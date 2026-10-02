import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false, // the floating dev badge overlaps the sidebar footer; error overlays still show
  // Native SQLite driver must stay a plain Node require (not bundled).
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  experimental: {
    serverActions: { bodySizeLimit: "6mb" }, // product images (3 MB) and CSV imports (5 MB)
  },
};

export default nextConfig;
