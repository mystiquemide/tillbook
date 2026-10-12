import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tillbook/underwriter"],
  webpack: (config) => {
    // The underwriter package uses NodeNext-style ".js" imports for its ".ts" sources.
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};

export default nextConfig;
