import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { createConfig as createPrivyConfig } from "@privy-io/wagmi";
import { monad } from "./chain";

/** Privy is used when an app ID is configured. Without it the app falls back to injected browser wallets. */
export const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
export const privyEnabled = privyAppId !== "";

export const wagmiConfig = privyEnabled
  ? createPrivyConfig({ chains: [monad], transports: { [monad.id]: http() }, ssr: true })
  : createConfig({ chains: [monad], connectors: [injected()], transports: { [monad.id]: http() }, ssr: true });
