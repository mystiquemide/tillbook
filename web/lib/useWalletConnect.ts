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

const SIGNED_IN_AT = "tillbook:signed-in-at";

function markSignedIn() {
  try {
    sessionStorage.setItem(SIGNED_IN_AT, String(Date.now()));
  } catch {}
}

/** Milliseconds since the person last finished a sign-in in this tab, or Infinity if they haven't. */
export function sinceSignIn(): number {
  try {
    const at = Number(sessionStorage.getItem(SIGNED_IN_AT));
    return at > 0 ? Date.now() - at : Infinity;
  } catch {
    return Infinity;
  }
}

function usePrivyConnect(): WalletConnect {
  const { ready } = usePrivy();
  const [failed, setFailed] = useState(false);
  const { login } = useLogin({
    onError: (e) => setFailed(e !== "exited_auth_flow"),
    onComplete: ({ wasAlreadyAuthenticated }) => {
      if (!wasAlreadyAuthenticated) markSignedIn();
    },
  });
  const { logout } = useLogout();
  const { disconnectAsync } = useDisconnect();
  return {
    connect: () => {
      setFailed(false);
      login();
    },
    // Privy ends the session, but wagmi keeps its cached account until reload, so clear both and reset the page.
    disconnect: () =>
      void logout()
        .then(() => disconnectAsync().catch(() => {}))
        .finally(() => window.location.reload()),
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
