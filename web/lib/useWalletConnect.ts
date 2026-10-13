"use client";

import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useConnect, useDisconnect } from "wagmi";
import { monad } from "./chain";
import { privyEnabled } from "./wagmi";

type WalletConnect = {
  connect: () => void;
  disconnect: () => void;
  isPending: boolean;
  failed: boolean;
  /** False only when there is no way to connect at all: no Privy and no browser wallet. */
  available: boolean;
};

function usePrivyConnect(): WalletConnect {
  const { ready } = usePrivy();
  const [failed, setFailed] = useState(false);
  const { login } = useLogin({ onError: (e) => setFailed(e !== "exited_auth_flow") });
  const { logout } = useLogout();
  return {
    connect: () => {
      setFailed(false);
      login();
    },
    disconnect: () => void logout(),
    isPending: !ready,
    failed,
    available: true,
  };
}

function useInjectedConnect(): WalletConnect {
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [available, setAvailable] = useState(true);
  useEffect(() => setAvailable("ethereum" in window), []);
  return {
    connect: () => connect({ connector: connectors[0]!, chainId: monad.id }),
    disconnect: () => disconnect(),
    isPending,
    failed: !!error,
    available,
  };
}

/** One connect flow for the whole app. Which implementation runs is fixed at build time. */
export const useWalletConnect = privyEnabled ? usePrivyConnect : useInjectedConnect;
