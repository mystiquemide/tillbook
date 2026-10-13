import { createConfig, http } from "wagmi";
import { monad } from "./chain";

/** Privy is used when an app ID is configured. Without it the app falls back to injected browser wallets. */
export const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
export const privyEnabled = privyAppId !== "";

/** Read-only chain access for public pages (landing, proof). No wallet code is loaded here. */
export const readConfig = createConfig({ chains: [monad], connectors: [], transports: { [monad.id]: http() }, ssr: true });
