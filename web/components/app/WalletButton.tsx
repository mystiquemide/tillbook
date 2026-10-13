"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { useWalletConnect } from "@/lib/useWalletConnect";
import { privyEnabled } from "@/lib/wagmi";
import { monad } from "@/lib/chain";
import { short } from "@/lib/format";

const pill = "inline-flex h-9 items-center rounded-full px-4 text-[14px] font-[450] transition-colors";

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, disconnect, isPending, failed, available } = useWalletConnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!isConnected) {
    if (!available) {
      return (
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className={`${pill} bg-ink text-white hover:bg-[#3a3436]`}>
          Install a wallet
        </a>
      );
    }
    return (
      <div className="flex items-center gap-3">
        {failed && <span role="alert" className="hidden text-[13px] text-error md:inline">{privyEnabled ? "Sign-in didn't finish. Try again." : "Wallet didn't connect. Try again."}</span>}
        <button
          type="button"
          onClick={connect}
          disabled={isPending}
          className={`${pill} bg-ink text-white hover:bg-[#3a3436] disabled:opacity-60`}
        >
          {isPending ? "Connecting..." : privyEnabled ? "Sign in" : "Connect wallet"}
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
