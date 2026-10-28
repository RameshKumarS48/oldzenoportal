import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Asset Tracking was renamed Vehicle Tracking; old links and bookmarks still work.
  async redirects() {
    return [
      { source: "/asset-tracking", destination: "/vehicle-tracking", permanent: true },
      { source: "/asset-tracking/:vin", destination: "/vehicle-tracking/:vin", permanent: true },
    ];
  },
};

export default nextConfig;
