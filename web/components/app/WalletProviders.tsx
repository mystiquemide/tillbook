"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { monad } from "@/lib/chain";
import { walletConfig } from "@/lib/walletConfig";
import { privyAppId, privyEnabled } from "@/lib/wagmi";

/** Sign-in and transaction support. Mounted only by app routes, so marketing pages don't load wallet code. */
export function WalletProviders({ children }: { children: ReactNode }) {
  if (!privyEnabled) return <WagmiProvider config={walletConfig}>{children}</WagmiProvider>;
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
      <PrivyWagmiProvider config={walletConfig}>{children}</PrivyWagmiProvider>
    </PrivyProvider>
  );
}
