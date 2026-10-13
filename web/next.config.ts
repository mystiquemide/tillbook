import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@tillbook/underwriter"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  webpack: (config) => {
    // The underwriter package uses NodeNext-style ".js" imports for its ".ts" sources.
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    // Optional peers of WalletConnect's logger and storage that this app never loads.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // A dynamic import inside viem's Tempo chain support, which this app never loads.
    config.ignoreWarnings = [...(config.ignoreWarnings ?? []), { module: /ox\/_esm\/tempo/ }];
    // Privy ships Solana and smart-account code paths as optional peers. Tillbook is EVM-only, so they resolve to nothing.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@solana/kit": false,
      "@solana-program/system": false,
      "@solana-program/token": false,
      "@solana-program/memo": false,
      "@farcaster/mini-app-solana": false,
      "@abstract-foundation/agw-client": false,
      permissionless: false,
    };
    return config;
  },
};

export default nextConfig;
