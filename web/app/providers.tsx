"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { monad } from "@/lib/chain";
import { privyAppId, privyEnabled, wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }));

  if (!privyEnabled)
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </WagmiProvider>
    );

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        // Email and Google give people without a crypto wallet a Monad wallet in seconds. Existing wallets still work.
        loginMethods: ["email", "google", "wallet"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: monad,
        supportedChains: [monad],
        appearance: { theme: "light", accentColor: "#6E54FF", landingHeader: "Sign in to Tillbook", walletChainType: "ethereum-only" },
      }}
    >
      <QueryClientProvider client={client}>
        <PrivyWagmiProvider config={wagmiConfig}>{children}</PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
