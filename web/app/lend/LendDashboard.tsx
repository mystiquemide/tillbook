"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { NotLive, Notice } from "@/components/app/Notice";
import { TxStatus } from "@/components/app/TxStatus";
import { erc20Abi, poolAbi } from "@/lib/abi";
import { addressUrl, addresses, isLive, monad, txUrl } from "@/lib/chain";
import { parseUsdc, short, usdc } from "@/lib/format";
import { useTx } from "@/lib/useTx";

/** Pool shares have 12 decimals (6 for USDC plus a 6 decimal offset), so 1 share is 1e12 units. */
const ONE_SHARE = 10n ** 12n;

type Advance = {
  merchant: string;
  amount: string;
  fee: string;
  holdbackBps: number;
  txHash: string;
  repaid: boolean;
  repaidTx: string | null;
};

export function LendDashboard() {
  if (!isLive) return <NotLive />;
  return <Live />;
}

function Live() {
  const { address, isConnected, chainId } = useAccount();
  const pool = useReadContracts({
    contracts: [
      { address: addresses.pool!, abi: poolAbi, functionName: "totalAssets" },
      { address: addresses.pool!, abi: poolAbi, functionName: "idle" },
      { address: addresses.pool!, abi: poolAbi, functionName: "principalOutstanding" },
      { address: addresses.pool!, abi: poolAbi, functionName: "convertToAssets", args: [ONE_SHARE] },
      { address: addresses.pool!, abi: poolAbi, functionName: "maxAdvance" },
    ],
  });
  const advances = useQuery({
    queryKey: ["advances"],
    queryFn: async () => {
      const r = await fetch("/api/advances", { cache: "no-store" });
      if (!r.ok) throw new Error("rpc");
      return (await r.json()).advances as Advance[];
    },
  });

  const [total, idle, out, price, cap] = (pool.data ?? []).map((d) => d.result as bigint | undefined);
  const refreshPool = () => Promise.all([pool.refetch(), advances.refetch()]);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-[40px] leading-[1.2] font-[500] tracking-[-0.03em]">Lend</h1>
        <p className="mt-2 max-w-[640px] text-[16px] leading-[1.6] text-ink-2">
          Deposit USDC. Merchants draw advances from it and repay them from their sales. The fee on each advance goes to
          lenders as it&apos;s repaid.
        </p>
      </div>

      <section aria-label="Pool">
        {pool.isError ? (
          <Notice title="Can't reach Monad right now." tone="error">
            <button type="button" onClick={() => pool.refetch()} className="mt-2 rounded-full bg-ink px-4 py-2 text-[14px] text-white">
              Try again
            </button>
          </Notice>
        ) : (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-hairline bg-hairline md:grid-cols-4">
            <Stat label="Total in pool" value={total} />
            <Stat label="Free to lend or withdraw" value={idle} />
            <Stat label="Lent to merchants" value={out} />
            <Stat label="Return since launch" value={price} percent />
          </dl>
        )}
        <p className="mt-3 text-[13px] text-ink-3">
          Live from{" "}
          <a href={addressUrl(addresses.pool!)} target="_blank" rel="noreferrer" className="font-mono hover:underline">
            LenderPool {short(addresses.pool!)}
          </a>
          {cap !== undefined && (
            <>
              . Each advance is capped onchain at <span className="font-mono">{usdc(cap)}</span> USDC
            </>
          )}
          .
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <section aria-labelledby="advances-title" className="order-last min-w-0 lg:order-none">
          <h2 id="advances-title" className="mb-4 text-[24px] font-[450] tracking-[-0.02em]">
            Advances
          </h2>
          <Advances query={advances} />
        </section>
        <aside aria-label="Your position" className="min-w-0 space-y-6">
          {!isConnected || !address ? (
            <Notice title="Connect a wallet to deposit.">Pool numbers above are public and read from Monad.</Notice>
          ) : chainId !== monad.id ? (
            <Notice title="Your wallet is on another network." tone="warning">
              Switch to Monad with the button at the top right.
            </Notice>
          ) : (
            <Position address={address} idle={idle} onChange={refreshPool} />
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, percent = false }: { label: string; value: bigint | undefined; percent?: boolean }) {
  return (
    <div className="bg-white p-5">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="mt-2 font-mono text-[22px] tracking-[-0.01em] md:text-[26px]">
        {value === undefined ? (
          <span className="text-[15px] text-ink-3">Reading...</span>
        ) : percent ? (
          // value is what 1 share (bought at 1.000000 USDC at launch) is worth now
          `${value >= 1_000_000n ? "+" : ""}${((Number(value) - 1e6) / 1e4).toFixed(2)}%`
        ) : (
          usdc(value)
        )}
      </dd>
    </div>
  );
}

function Position({ address, idle, onChange }: { address: `0x${string}`; idle: bigint | undefined; onChange: () => void }) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [input, setInput] = useState("");
  const tx = useTx();

  const me = useReadContracts({
    contracts: [
      { address: addresses.token, abi: erc20Abi, functionName: "balanceOf", args: [address] },
      { address: addresses.token, abi: erc20Abi, functionName: "allowance", args: [address, addresses.pool!] },
      { address: addresses.pool!, abi: poolAbi, functionName: "balanceOf", args: [address] },
      { address: addresses.pool!, abi: poolAbi, functionName: "maxWithdraw", args: [address] },
    ],
  });
  const history = useQuery({
    queryKey: ["lender", address],
    queryFn: async () => {
      const r = await fetch(`/api/lender/${address}`, { cache: "no-store" });
      if (!r.ok) throw new Error("rpc");
      return (await r.json()) as { deposited: string; withdrawn: string };
    },
  });
  const shares = me.data?.[2]?.result as bigint | undefined;
  const value = useReadContracts({
    contracts: [{ address: addresses.pool!, abi: poolAbi, functionName: "convertToAssets", args: [shares ?? 0n] }],
    query: { enabled: shares !== undefined },
  });

  const [balance, allowance, , maxWithdraw] = (me.data ?? []).map((d) => d.result as bigint | undefined);
  const worth = value.data?.[0]?.result as bigint | undefined;
  const net = history.data ? BigInt(history.data.deposited) - BigInt(history.data.withdrawn) : undefined;
  const earned = worth !== undefined && net !== undefined ? worth - net : undefined;

  const amount = parseUsdc(input);
  const limit = mode === "deposit" ? balance : maxWithdraw;
  const busy = tx.state.status === "signing" || tx.state.status === "pending";
  const needsApproval = mode === "deposit" && amount !== null && allowance !== undefined && allowance < amount;

  let problem: string | null = null;
  if (input && amount === null) problem = "Enter an amount like 25 or 25.50.";
  else if (amount !== null && limit !== undefined && amount > limit) {
    problem =
      mode === "deposit"
        ? `You have ${usdc(balance ?? 0n)} USDC in this wallet.`
        : maxWithdraw !== undefined && worth !== undefined && maxWithdraw < worth
          ? `Only ${usdc(maxWithdraw)} USDC is free right now. The rest is lent to merchants.`
          : `You can withdraw up to ${usdc(maxWithdraw ?? 0n)} USDC.`;
  }

  async function submit() {
    if (amount === null) return;
    let ok: boolean;
    if (mode === "deposit") {
      if (needsApproval) {
        ok = await tx.send("Allow USDC", { address: addresses.token, abi: erc20Abi, functionName: "approve", args: [addresses.pool!, amount] });
        await me.refetch();
        if (!ok) return;
      }
      ok = await tx.send("Deposit", { address: addresses.pool!, abi: poolAbi, functionName: "deposit", args: [amount, address] });
    } else {
      ok = await tx.send("Withdraw", { address: addresses.pool!, abi: poolAbi, functionName: "withdraw", args: [amount, address, address] });
    }
    if (ok) setInput("");
    await Promise.all([me.refetch(), history.refetch(), value.refetch()]);
    onChange();
  }

  return (
    <>
      <div className="rounded-[16px] border border-hairline bg-white p-6">
        <p className="text-[14px] text-ink-2">Your deposit is worth</p>
        <p className="mt-1 font-mono text-[36px] leading-[1.1] tracking-[-0.02em]">{worth === undefined ? "..." : usdc(worth)}</p>
        <p className="mt-1 text-[14px] text-ink-2">
          USDC
          {earned !== undefined && net !== undefined && net > 0n && (
            <>
              . Earned so far <span className={`font-mono ${earned > 0n ? "text-positive" : "text-ink"}`}>{usdc(earned > 0n ? earned : 0n)}</span>
            </>
          )}
          .
        </p>
      </div>

      <div className="rounded-[16px] border border-hairline bg-white p-6">
        <div role="tablist" aria-label="Action" className="mb-5 grid grid-cols-2 rounded-full bg-surface p-1 ring-1 ring-hairline">
          {(["deposit", "withdraw"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setInput("");
                tx.reset();
              }}
              className={`h-9 rounded-full text-[15px] capitalize transition-colors ${mode === m ? "bg-white text-ink shadow-[0_0_0_1px_var(--hairline)]" : "text-ink-2"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <label htmlFor="amount" className="text-[13px] text-ink-2">
          Amount in USDC
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-full bg-surface px-4 ring-1 ring-hairline focus-within:ring-2 focus-within:ring-primary">
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(",", "."))}
            className="h-12 min-w-0 flex-1 bg-transparent font-mono text-[18px] outline-none focus-visible:outline-none"
          />
          <button
            type="button"
            disabled={limit === undefined || limit === 0n}
            onClick={() => limit !== undefined && setInput(formatUnits(limit, 6))}
            className="-mr-2 px-2 py-2 text-[14px] text-primary-ink disabled:text-ink-3"
          >
            Max
          </button>
        </div>
        <p className="mt-2 text-[13px] text-ink-3">
          {mode === "deposit" ? (
            <>
              In your wallet: <span className="font-mono">{balance === undefined ? "..." : usdc(balance)}</span>
            </>
          ) : (
            <>
              You can withdraw now: <span className="font-mono">{maxWithdraw === undefined ? "..." : usdc(maxWithdraw)}</span>
              {idle !== undefined && idle === 0n && " (everything is lent out)"}
            </>
          )}
        </p>
        {problem && <p className="mt-3 text-[14px] text-warning">{problem}</p>}
        <button
          type="button"
          disabled={busy || amount === null || problem !== null}
          onClick={submit}
          className="mt-5 h-12 w-full rounded-full bg-primary text-[16px] font-[450] text-white hover:bg-primary-ink disabled:bg-surface disabled:text-ink-2 disabled:ring-1 disabled:ring-hairline"
        >
          {busy
            ? "Waiting for Monad..."
            : amount === null
              ? mode === "deposit"
                ? "Enter an amount to deposit"
                : "Enter an amount to withdraw"
              : needsApproval
                ? `Allow and deposit ${usdc(amount)} USDC`
                : `${mode === "deposit" ? "Deposit" : "Withdraw"} ${usdc(amount)} USDC`}
        </button>
        <div className="mt-3">
          <TxStatus state={tx.state} />
        </div>
      </div>
    </>
  );
}

function Advances({ query }: { query: ReturnType<typeof useQuery<Advance[]>> }) {
  if (query.isLoading) return <p className="text-[15px] text-ink-2">Reading from Monad...</p>;
  if (query.isError)
    return (
      <Notice title="Can't load advances right now." tone="error">
        <button type="button" onClick={() => query.refetch()} className="mt-2 rounded-full bg-ink px-4 py-2 text-[14px] text-white">
          Try again
        </button>
      </Notice>
    );
  const rows = query.data ?? [];
  if (rows.length === 0) return <Notice title="No advances yet.">When a merchant draws from the pool it shows up here.</Notice>;
  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {rows.map((a) => (
        <li key={a.txHash} className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <a href={addressUrl(a.merchant)} target="_blank" rel="noreferrer" className="font-mono text-[14px] hover:underline">
              {short(a.merchant)}
            </a>
            <p className="text-[13px] text-ink-3">
              Fee <span className="font-mono">{usdc(BigInt(a.fee))}</span>, {a.holdbackBps / 100}% of sales
            </p>
          </div>
          <div className="text-right">
            <a href={txUrl(a.txHash)} target="_blank" rel="noreferrer" className="font-mono text-[16px] hover:underline">
              {usdc(BigInt(a.amount))}
            </a>
            <p className="text-[13px]">
              {a.repaid && a.repaidTx ? (
                <a href={txUrl(a.repaidTx)} target="_blank" rel="noreferrer" className="text-positive hover:underline">
                  Repaid
                </a>
              ) : (
                <span className="text-primary-ink">Repaying</span>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
