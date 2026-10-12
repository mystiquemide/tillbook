import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  transpilePackages: ["@tillbook/underwriter"],
  webpack: (config) => {
    // The underwriter package uses NodeNext-style ".js" imports for its ".ts" sources.
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};

export default nextConfig;
