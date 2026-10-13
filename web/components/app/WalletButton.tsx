"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { useWalletConnect } from "@/lib/useWalletConnect";
import { Check, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { privyEnabled } from "@/lib/wagmi";
import { addressUrl, monad } from "@/lib/chain";
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
    <div className="flex items-center gap-2">
      <span
        className="hidden h-9 items-center gap-2 rounded-full px-3 text-[13px] text-ink-2 ring-1 ring-hairline md:inline-flex"
        title="Chain 143. Payments and deposits use native USDC."
      >
        <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
        Monad mainnet · USDC
      </span>
      <AccountMenu address={address!} onSignOut={disconnect} />
    </div>
  );
}

/** Connected wallet: copy the address, open it on the explorer, or sign out. */
function AccountMenu({ address, onSignOut }: { address: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const base = "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] transition-colors";
  const item = `${base} text-ink hover:bg-surface`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${pill} gap-2 bg-surface font-mono text-[13px] text-ink ring-1 ring-hairline hover:bg-[#f1f0ee]`}
      >
        <span className="h-2 w-2 rounded-full bg-positive" aria-hidden="true" />
        {short(address)}
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-[16px] border border-hairline bg-white p-2 shadow-[0_18px_40px_-16px_rgba(33,29,29,0.28)]"
        >
          <p className="px-3 pt-2 pb-1 text-[12px] text-ink-3">Signed in on Monad mainnet (chain 143)</p>
          <p className="px-3 pb-3 font-mono text-[12px] break-all text-ink-2">{address}</p>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={async () => {
              await navigator.clipboard.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? <Check size={16} className="text-positive" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? "Copied" : "Copy address"}
          </button>
          <a role="menuitem" href={addressUrl(address)} target="_blank" rel="noreferrer" className={item}>
            <ExternalLink size={16} aria-hidden="true" />
            View on Monadscan
          </a>
          <div className="my-1 h-px bg-hairline" />
          <button
            type="button"
            role="menuitem"
            className={`${base} text-error hover:bg-[rgba(194,65,12,0.06)]`}
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              onSignOut();
              if (!privyEnabled) setOpen(false);
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            {signingOut ? "Signing out..." : privyEnabled ? "Sign out" : "Disconnect"}
          </button>
        </div>
      )}
    </div>
  );
}
