import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monad } from "./chain";

export const wagmiConfig = createConfig({
  chains: [monad],
  connectors: [injected()],
  transports: { [monad.id]: http() },
  ssr: true,
});
