"use client";

import { useState } from "react";
import { toHex } from "viem";
import { useAccount, useReadContracts, useSwitchChain } from "wagmi";
import { useWalletConnect } from "@/lib/useWalletConnect";
import { privyEnabled } from "@/lib/wagmi";
import { TxStatus } from "@/components/app/TxStatus";
import { erc20Abi, routerAbi } from "@/lib/abi";
import { addressUrl, addresses, monad } from "@/lib/chain";
import { parseUsdc, short, usdc } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { card } from "@/components/app/Notice";
import { ShieldCheck } from "lucide-react";

const primary =
  "h-12 w-full rounded-full bg-primary text-[16px] font-[450] text-white hover:bg-primary-ink disabled:bg-surface disabled:text-ink-2 disabled:ring-1 disabled:ring-hairline";

export function Checkout({ merchant, requested = "" }: { merchant: `0x${string}`; requested?: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending: connecting } = useWalletConnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [input, setInput] = useState(requested);
  const [paid, setPaid] = useState<{ amount: bigint; toPool: bigint } | null>(null);
  const tx = useTx();

  const amount = parseUsdc(input);
  const reads = useReadContracts({
    contracts: [
      { address: addresses.token, abi: erc20Abi, functionName: "balanceOf", args: [address ?? merchant] },
      { address: addresses.token, abi: erc20Abi, functionName: "allowance", args: [address ?? merchant, addresses.router!] },
      { address: addresses.router!, abi: routerAbi, functionName: "quote", args: [merchant, amount ?? 0n] },
    ],
  });
  const balance = address ? (reads.data?.[0]?.result as bigint | undefined) : undefined;
  const allowance = address ? (reads.data?.[1]?.result as bigint | undefined) : undefined;
  const quote = reads.data?.[2]?.result as readonly [bigint, bigint] | undefined;
  const toPool = amount !== null && quote ? quote[0] : 0n;

  const busy = tx.state.status === "signing" || tx.state.status === "pending";
  const needsApproval = amount !== null && allowance !== undefined && allowance < amount;
  let problem: string | null = null;
  if (input && amount === null) problem = "Enter an amount like 25 or 25.50.";
  else if (amount !== null && balance !== undefined && amount > balance)
    problem = `You have ${usdc(balance)} USDC. You need ${usdc(amount - balance)} more.`;
  if (address && address.toLowerCase() === merchant.toLowerCase()) problem = "This is your own payment link. Pay from a different wallet.";

  async function pay() {
    if (amount === null) return;
    if (needsApproval) {
      const ok = await tx.send("Allow USDC", { address: addresses.token, abi: erc20Abi, functionName: "approve", args: [addresses.router!, amount] });
      await reads.refetch();
      if (!ok) return;
    }
    const ref = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const split = toPool;
    const ok = await tx.send("Payment", { address: addresses.router!, abi: routerAbi, functionName: "pay", args: [merchant, amount, ref] });
    if (ok) {
      setPaid({ amount, toPool: split });
      setInput("");
    }
    await reads.refetch();
  }

  if (paid && tx.state.status === "success") {
    return (
      <div className="rounded-[24px] border border-hairline bg-white p-8 text-center">
        <p className="text-[15px] text-positive">Paid</p>
        <p className="mt-2 font-mono text-[44px] leading-[1.1] tracking-[-0.02em]">{usdc(paid.amount)}</p>
        <p className="mt-1 text-[15px] text-ink-2">USDC to {short(merchant)}</p>
        <div className="mt-6 text-left">
          <TxStatus state={tx.state} />
          {paid.toPool > 0n && <Split amount={paid.amount} toPool={paid.toPool} done />}
        </div>
        <button
          type="button"
          onClick={() => {
            setPaid(null);
            tx.reset();
          }}
          className="mt-8 h-12 w-full rounded-full bg-primary-tint text-[16px] font-[450] text-primary-ink hover:bg-[rgba(110,84,255,0.16)]"
        >
          Make another payment
        </button>
      </div>
    );
  }

  return (
    <div className="rise">
    <div className={`${card} p-6 md:p-8`}>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] font-mono text-[15px] text-white"
          style={{ background: `hsl(${parseInt(merchant.slice(2, 6), 16) % 360} 62% 52%)` }}
        >
          {merchant.slice(2, 4).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-[14px] font-[400] text-ink-2">Pay this merchant</h1>
          <a href={addressUrl(merchant)} target="_blank" rel="noreferrer" className="block font-mono text-[18px] hover:underline">
            {short(merchant)}
          </a>
        </div>
      </div>

      <label htmlFor="amount" className="mt-8 block text-[13px] text-ink-2">
        Amount in USDC
      </label>
      <div className="mt-2 flex items-center rounded-[16px] bg-surface px-4 ring-1 ring-hairline focus-within:ring-2 focus-within:ring-primary">
        <input
          id="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(",", "."))}
          className="h-16 min-w-0 flex-1 bg-transparent font-mono text-[28px] outline-none focus-visible:outline-none"
        />
        <span className="text-[15px] text-ink-2">USDC</span>
      </div>
      <p className="mt-2 text-[13px] text-ink-3">
        {balance !== undefined ? (
          <>
            In your wallet: <span className="font-mono">{usdc(balance)}</span>
          </>
        ) : (
          "Connect a wallet to see your balance."
        )}
      </p>

      {amount !== null && toPool > 0n && <Split amount={amount} toPool={toPool} />}
      {problem && <p className="mt-4 text-[14px] text-warning">{problem}</p>}

      <div className="mt-6">
        {!isConnected ? (
          <button
            type="button"
            disabled={connecting}
            onClick={connect}
            className={primary}
          >
            {connecting ? "Connecting..." : privyEnabled ? "Sign in to pay" : "Connect wallet to pay"}
          </button>
        ) : chainId !== monad.id ? (
          <button type="button" disabled={switching} onClick={() => switchChain({ chainId: monad.id })} className={primary}>
            {switching ? "Switching..." : "Switch to Monad to pay"}
          </button>
        ) : (
          <button type="button" disabled={busy || amount === null || problem !== null} onClick={pay} className={primary}>
            {busy
              ? "Waiting for Monad..."
              : amount === null
                ? "Enter an amount"
                : needsApproval
                  ? `Allow and pay ${usdc(amount)} USDC`
                  : `Pay ${usdc(amount)} USDC`}
          </button>
        )}
      </div>
      <div className="mt-3">
        <TxStatus state={tx.state} />
      </div>
      <p className="mt-6 text-[13px] leading-[1.6] text-ink-3">
        Paid in USDC on Monad through the Tillbook payment contract. Your wallet also pays a small Monad network fee in MON.
      </p>
    </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-ink-3">
        <ShieldCheck size={14} aria-hidden="true" />
        Tillbook never holds your money. It goes straight to the merchant.
      </p>
    </div>
  );
}

function Split({ amount, toPool, done = false }: { amount: bigint; toPool: bigint; done?: boolean }) {
  return (
    <div className="mt-5 rounded-[12px] bg-surface p-4 text-[14px]">
      <p className="text-ink-2">
        This merchant is repaying an advance, so {done ? "part of this payment went" : "part of this payment goes"} to their lenders.
      </p>
      <dl className="mt-3 space-y-1.5">
        <div className="flex justify-between">
          <dt className="text-ink-2">To the merchant</dt>
          <dd className="font-mono">{usdc(amount - toPool)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-2">To their lenders</dt>
          <dd className="font-mono text-primary-ink">{usdc(toPool)}</dd>
        </div>
      </dl>
    </div>
  );
}
