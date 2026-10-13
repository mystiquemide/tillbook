"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useEffect, useState } from "react";
import { monad } from "@/lib/chain";
import { short } from "@/lib/format";

const pill = "inline-flex h-9 items-center rounded-full px-4 text-[14px] font-[450] transition-colors";

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [hasProvider, setHasProvider] = useState(true);

  useEffect(() => {
    setHasProvider(typeof window !== "undefined" && "ethereum" in window);
  }, []);

  if (!isConnected) {
    if (!hasProvider) {
      return (
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className={`${pill} bg-ink text-white hover:bg-[#3a3436]`}>
          Install a wallet
        </a>
      );
    }
    return (
      <div className="flex items-center gap-3">
        {error && <span role="alert" className="hidden text-[13px] text-error md:inline">Wallet didn&apos;t connect. Try again.</span>}
        <button
          type="button"
          onClick={() => connect({ connector: connectors[0]!, chainId: monad.id })}
          disabled={isPending}
          className={`${pill} bg-ink text-white hover:bg-[#3a3436] disabled:opacity-60`}
        >
          {isPending ? "Connecting..." : "Connect wallet"}
        </button>
      </div>
    );
  }

  if (chainId !== monad.id) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: monad.id })}
        disabled={switching}
        className={`${pill} bg-warning text-white disabled:opacity-60`}
      >
        {switching ? "Switching..." : "Switch to Monad"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => disconnect()}
      title="Disconnect"
      className={`${pill} bg-surface font-mono text-[13px] text-ink ring-1 ring-hairline hover:bg-[#f1f0ee]`}
    >
      {short(address!)}
    </button>
  );
}
