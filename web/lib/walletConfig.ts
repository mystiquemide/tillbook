import { createConfig as createPrivyConfig } from "@privy-io/wagmi";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monad } from "./chain";
import { privyEnabled } from "./wagmi";

/** Wallet-capable config, loaded only on pages where people sign in and send transactions. */
export const walletConfig = privyEnabled
  ? createPrivyConfig({ chains: [monad], transports: { [monad.id]: http() }, ssr: true })
  : createConfig({ chains: [monad], connectors: [injected()], transports: { [monad.id]: http() }, ssr: true });
