"use client";

import { useExportWallet, useLogin, useLogout, useWallets } from "@privy-io/react-auth";
import { KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { privyEnabled } from "@/lib/wagmi";
import { sinceSignIn } from "@/lib/useWalletConnect";
import { card } from "./Notice";

/** How recent a sign-in must be before the private key can be shown. */
const FRESH_MS = 5 * 60_000;

/** Backup and export. Only Privy embedded wallets can be exported here, and only in Privy's own isolated window. */
export const KeyExport = privyEnabled ? PrivyKeyExport : () => <SelfCustody />;

function Shell({ children, safe = false }: { children: React.ReactNode; safe?: boolean }) {
  return (
    <section aria-labelledby="security-title" className={`${card} p-6`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-[12px] ${safe ? "bg-[rgba(22,128,61,0.1)] text-positive" : "bg-primary-tint text-primary-ink"}`}
          aria-hidden="true"
        >
          {safe ? <ShieldCheck size={19} /> : <KeyRound size={19} />}
        </span>
        <h2 id="security-title" className="text-[17px] font-[450]">
          Backup and security
        </h2>
      </div>
      <div className="mt-4 text-[15px] leading-[1.6] text-ink-2">{children}</div>
    </section>
  );
}

function SelfCustody({ name }: { name?: string }) {
  return (
    <Shell safe>
      This wallet lives in {name ? <span className="text-ink">{name}</span> : "your browser wallet"}, and its keys never touch
      Tillbook. To back it up or move it, use the export or recovery-phrase option in that wallet&apos;s own settings.
    </Shell>
  );
}

const walletNames: Record<string, string> = {
  metamask: "MetaMask",
  rabby_wallet: "Rabby",
  coinbase_wallet: "Coinbase Wallet",
  rainbow: "Rainbow",
  phantom: "Phantom",
  wallet_connect: "your connected wallet",
};

function PrivyKeyExport({ address }: { address: string }) {
  const { wallets, ready } = useWallets();
  const wallet = wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());
  if (!ready) return <Shell>Checking your wallet...</Shell>;
  // Only wallets Privy created for this account can be exported. Anything else is held by its own app.
  if (!wallet || wallet.walletClientType !== "privy") return <SelfCustody name={wallet ? walletNames[wallet.walletClientType] : undefined} />;
  return <EmbeddedExport address={wallet.address} />;
}

function EmbeddedExport({ address }: { address: string }) {
  const { exportWallet } = useExportWallet();
  const { logout } = useLogout();
  const { login } = useLogin();
  const [agreed, setAgreed] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const check = () => setFresh(sinceSignIn() < FRESH_MS);
    check();
    const t = setInterval(check, 10_000);
    return () => clearInterval(t);
  }, []);

  async function reauth() {
    setError("");
    setBusy(true);
    // A fresh sign-in proves the person at the keyboard still controls the email or account behind this wallet.
    try {
      await logout();
      login();
    } catch {
      setError("Couldn't start the check. Refresh the page and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    setError("");
    setBusy(true);
    try {
      // Privy shows the key in its own sandboxed window on a separate domain. Tillbook's page can't read it.
      await exportWallet({ address });
    } catch {
      setError("The export window didn't open. Sign in again and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <p>
        Tillbook created this wallet when you signed in. You can export its private key to use the same wallet in another
        app, like MetaMask.
      </p>
      <ul className="mt-4 space-y-2 rounded-[14px] bg-[rgba(194,65,12,0.06)] p-4 text-[14px] leading-[1.55] text-ink">
        <li className="flex gap-2">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-error" aria-hidden="true" />
          Anyone with this key can take everything in this wallet, and it can&apos;t be undone.
        </li>
        <li className="flex gap-2">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-error" aria-hidden="true" />
          Tillbook and Privy will never ask you for it. Never paste it into a website, chat or form.
        </li>
        <li className="flex gap-2">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-error" aria-hidden="true" />
          Export it somewhere private, with nobody watching your screen.
        </li>
      </ul>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14px] text-ink">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-[#6E54FF]" />
        I understand that anyone who sees my private key controls my money.
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {fresh ? (
          <button
            type="button"
            disabled={!agreed || busy}
            onClick={reveal}
            className="h-11 rounded-full bg-ink px-5 text-[15px] font-[450] text-white hover:bg-[#3a3436] disabled:opacity-50"
          >
            {busy ? "Opening..." : "Show private key"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!agreed || busy}
            onClick={reauth}
            className="h-11 rounded-full bg-ink px-5 text-[15px] font-[450] text-white hover:bg-[#3a3436] disabled:opacity-50"
          >
            {busy ? "Starting..." : "Confirm it's you"}
          </button>
        )}
        <span className="text-[13px] text-ink-3">
          {fresh ? "Opens in Privy's secure window. Tillbook never sees the key." : "You'll sign in again with a fresh code first."}
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[14px] text-error">
          {error}
        </p>
      )}
    </Shell>
  );
}
