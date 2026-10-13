"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ComponentType } from "react";
import { formatEther, formatUnits, getAddress, isAddress, parseEther, type Address } from "viem";
import { useAccount, useBalance, useGasPrice, useReadContract, useReadContracts, useSendTransaction, useWriteContract } from "wagmi";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Check,
  Copy,
  ExternalLink,
  Fuel,
  HandCoins,
  Landmark,
  Lock,
  PiggyBank,
  QrCode,
  Send,
  Store,
} from "lucide-react";
import { ConnectPrompt } from "@/components/app/ConnectPrompt";
import { KeyExport } from "@/components/app/KeyExport";
import { Notice, card } from "@/components/app/Notice";
import { PageHeader } from "@/components/app/PageHeader";
import { TxStatus } from "@/components/app/TxStatus";
import { erc20Abi, poolAbi } from "@/lib/abi";
import { addressUrl, addresses, monad, txUrl } from "@/lib/chain";
import { date, parseUsdc, short, usdc } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { useViewAuth } from "@/lib/useViewAuth";

type Item = {
  hash: string;
  time: number;
  kind: "paid" | "sale" | "deposit" | "withdraw" | "advance" | "sent" | "received";
  delta: string;
  counterparty: string | null;
  repaid?: string;
};

export function WalletHome() {
  const { address, isConnected, chainId } = useAccount();
  if (!isConnected || !address)
    return (
      <div className="space-y-10">
        <PageHeader title="Wallet" description="See your balance, send and receive money, and back up your wallet." />
        <ConnectPrompt
          title="Sign in to open your wallet"
          body="Your Tillbook wallet holds digital dollars (USDC). Signing in with email creates one for you if you don't have one."
          points={["See your balance and every payment", "Send money to anyone with a Monad address", "Get a QR code so people can pay you"]}
          cta="Open my wallet"
        />
      </div>
    );
  if (chainId !== monad.id) return <Notice title="Switch to Monad to see this wallet." tone="warning">Use the button at the top right.</Notice>;
  return <Home address={address} />;
}

function Home({ address }: { address: Address }) {
  const reads = useReadContracts({
    contracts: [{ address: addresses.token, abi: erc20Abi, functionName: "balanceOf", args: [address] }],
  });
  const shares = useReadContract({
    address: addresses.pool,
    abi: poolAbi,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!addresses.pool },
  });
  const position = useReadContract({
    address: addresses.pool,
    abi: poolAbi,
    functionName: "convertToAssets",
    args: [shares.data ?? 0n],
    query: { enabled: !!addresses.pool && shares.data !== undefined },
  });
  const mon = useBalance({ address });
  const view = useViewAuth(address);
  const history = useQuery({
    queryKey: ["wallet-history", address, view.authorized],
    enabled: view.authorized,
    queryFn: async () => {
      const r = await fetch(`/api/wallet/${address}`, { cache: "no-store", headers: view.headers });
      // An expired or rejected signature: forget it so the person can sign again.
      if (r.status === 401) view.clear();
      if (!r.ok) throw new Error("history");
      return (await r.json()).items as Item[];
    },
  });

  const usdcBal = reads.data?.[0]?.result as bigint | undefined;
  const pos = !addresses.pool || shares.data === 0n ? 0n : (position.data as bigint | undefined);
  const loading = usdcBal === undefined || pos === undefined || mon.data === undefined;
  const failed = reads.isError || mon.isError || shares.isError;

  const refresh = () => {
    reads.refetch();
    shares.refetch();
    position.refetch();
    mon.refetch();
    // The history endpoint reads logs, which can trail the receipt by a block or two.
    setTimeout(() => history.refetch(), 1500);
  };

  const [panel, setPanel] = useState<"send" | "receive">("send");

  return (
    <div className="space-y-10">
      <PageHeader
        title="Wallet"
        description="Your money on Tillbook, read live from Monad. Send, receive, and keep your wallet backed up."
      />

      <section aria-label="Balance" className={`${card} overflow-hidden`}>
        <div className="p-6 md:p-8">
          <p className="text-[14px] text-ink-2">Total in dollars</p>
          {failed ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-[16px] text-error">Couldn&apos;t reach Monad to load your balance.</p>
              <button type="button" onClick={refresh} className="rounded-full bg-ink px-4 py-2 text-[14px] text-white">
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="mt-2 h-12 w-48 animate-pulse rounded-[10px] bg-surface" aria-label="Loading balance" />
          ) : (
            <p className="mt-1 font-mono text-[44px] leading-[1.1] font-[500] tracking-[-0.03em] md:text-[52px]">
              ${usdc(usdcBal! + pos!)}
            </p>
          )}
          <p className="mt-2 text-[13px] text-ink-3">
            USDC plus your lending deposit. 1 USDC is worth 1 US dollar.{" "}
            <a href={addressUrl(address)} target="_blank" rel="noreferrer" className="text-primary-ink underline-offset-2 hover:underline">
              Check on Monadscan
            </a>
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:max-w-[360px]">
            {(
              [
                ["send", "Send", ArrowUpRight],
                ["receive", "Receive", ArrowDownLeft],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                aria-pressed={panel === k}
                onClick={() => {
                  setPanel(k);
                  document.getElementById("move")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-[15px] font-[450] transition-colors ${
                  panel === k ? "bg-primary text-white" : "bg-primary-tint text-primary-ink hover:bg-[rgba(110,84,255,0.16)]"
                }`}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-hairline border-t border-hairline">
          <Asset icon={BadgeDollarSign} name="USDC" note="Digital dollars. This is what you pay, get paid and lend with." value={usdcBal === undefined ? undefined : `${usdc(usdcBal)} USDC`} />
          <Asset
            icon={PiggyBank}
            name="Lending deposit"
            note={pos ? "What your pool deposit is worth now, including fees earned." : "Nothing deposited. Lend USDC to earn the 6% advance fee."}
            value={pos === undefined ? undefined : `${usdc(pos)} USDC`}
            action={<Link href="/lend" className="text-[13px] text-primary-ink underline-offset-2 hover:underline">{pos ? "Manage" : "Lend"}</Link>}
          />
          <Asset
            icon={Fuel}
            name="MON"
            note={
              mon.data && mon.data.value === 0n
                ? "You need a little MON to send or pay. Each action costs a fraction of a cent."
                : "Covers network fees. Each action costs a fraction of a cent."
            }
            warn={mon.data?.value === 0n}
            value={mon.data === undefined ? undefined : `${Number(formatEther(mon.data.value)).toLocaleString("en-US", { maximumFractionDigits: 4 })} MON`}
          />
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div id="move" className="scroll-mt-24 space-y-6">
          {panel === "send" ? (
            <SendPanel address={address} usdcBal={usdcBal} monBal={mon.data?.value} onSent={refresh} />
          ) : (
            <ReceivePanel address={address} />
          )}
          <KeyExport address={address} />
        </div>
        <History address={address} q={history} view={view} />
      </div>
    </div>
  );
}

function Asset({
  icon: Icon,
  name,
  note,
  value,
  action,
  warn,
}: {
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  name: string;
  note: string;
  value: string | undefined;
  action?: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <li className="flex items-center gap-4 px-6 py-4 md:px-8">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ink-2 ring-1 ring-hairline">
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-[450]">
          {name} {action && <span className="ml-1">{action}</span>}
        </p>
        <p className={`text-[13px] leading-[1.45] ${warn ? "text-warning" : "text-ink-3"}`}>{note}</p>
      </div>
      {value === undefined ? (
        <span className="h-5 w-20 animate-pulse rounded bg-surface" aria-label="Loading" />
      ) : (
        <span className="shrink-0 text-right font-mono text-[15px]">{value}</span>
      )}
    </li>
  );
}

// Fixed gas for a plain transfer, and a safe ceiling for a USDC transfer. Monad charges for the gas limit.
const GAS = { MON: 21_000n, USDC: 100_000n };
const blocked: Record<string, string> = {
  ...(addresses.pool && {
    [addresses.pool.toLowerCase()]: "That's the lending pool. Money sent there directly can't be withdrawn. To lend, use the Lend page.",
  }),
  ...(addresses.router && { [addresses.router.toLowerCase()]: "That's Tillbook's payment contract. It can't receive money directly." }),
  [addresses.token.toLowerCase()]: "That's the USDC contract itself. Anything sent there is lost.",
};

function SendPanel({
  address,
  usdcBal,
  monBal,
  onSent,
}: {
  address: Address;
  usdcBal: bigint | undefined;
  monBal: bigint | undefined;
  onSent: () => void;
}) {
  const [asset, setAsset] = useState<"USDC" | "MON">("USDC");
  const [to, setTo] = useState("");
  const [amountIn, setAmountIn] = useState("");
  const [review, setReview] = useState(false);
  const gasPrice = useGasPrice();
  const tx = useTx();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const fee = gasPrice.data !== undefined ? gasPrice.data * GAS[asset] : undefined;
  const balance = asset === "USDC" ? usdcBal : monBal;
  const decimals = asset === "USDC" ? 6 : 18;
  const amount = asset === "USDC" ? parseUsdc(amountIn) : parseMon(amountIn);
  const toTrim = to.trim();

  let toError = "";
  if (toTrim && !isAddress(toTrim, { strict: false })) toError = "That isn't a Monad address. It should start with 0x and have 42 characters.";
  else if (toTrim && toTrim.toLowerCase() === address.toLowerCase()) toError = "That's your own address.";
  else if (toTrim && blocked[toTrim.toLowerCase()]) toError = blocked[toTrim.toLowerCase()];

  let amountError = "";
  if (amountIn.trim() && amount === null) amountError = asset === "USDC" ? "Enter an amount like 5 or 5.25." : "Enter an amount like 0.1.";
  else if (amount !== null && balance !== undefined) {
    if (amount > balance) amountError = `You have ${fmt(balance, decimals)} ${asset}.`;
    else if (asset === "MON" && fee !== undefined && amount + fee > balance)
      amountError = `Leave about ${fmt(fee, 18)} MON for the network fee.`;
  }
  const noGas = monBal !== undefined && fee !== undefined && monBal < fee;
  const ready = !!toTrim && !toError && amount !== null && !amountError && !noGas && balance !== undefined;
  const busy = tx.state.status === "signing" || tx.state.status === "pending";

  function max() {
    if (balance === undefined) return;
    const v = asset === "MON" ? (fee !== undefined && balance > fee * 2n ? balance - fee * 2n : 0n) : balance;
    setAmountIn(formatUnits(v, decimals));
  }

  async function send() {
    const recipient = getAddress(toTrim);
    const ok = await tx.run(asset === "USDC" ? "Transfer" : "MON transfer", () =>
      asset === "USDC"
        ? writeContractAsync({ address: addresses.token, abi: erc20Abi, functionName: "transfer", args: [recipient, amount!], chainId: monad.id })
        : sendTransactionAsync({ to: recipient, value: amount!, chainId: monad.id }),
    );
    setReview(false);
    if (ok) {
      setTo("");
      setAmountIn("");
    }
    onSent();
  }

  return (
    <section aria-labelledby="send-title" className={`${card} p-6`}>
      <h2 id="send-title" className="flex items-center gap-2 text-[17px] font-[450]">
        <Send size={17} aria-hidden="true" /> Send money
      </h2>
      <p className="mt-1 text-[14px] leading-[1.5] text-ink-2">Send to any wallet on Monad. Transfers can&apos;t be reversed, so check the address.</p>

      {!review ? (
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) {
              tx.reset();
              setReview(true);
            }
          }}
        >
          <fieldset>
            <legend className="text-[13px] text-ink-2">What to send</legend>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-surface p-1 ring-1 ring-hairline">
              {(["USDC", "MON"] as const).map((a) => (
                <label
                  key={a}
                  className={`cursor-pointer rounded-full py-2 text-center text-[14px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                    asset === a ? "bg-white font-[450] text-ink shadow-sm" : "text-ink-2"
                  }`}
                >
                  <input type="radio" name="asset" value={a} checked={asset === a} onChange={() => setAsset(a)} className="sr-only" />
                  {a === "USDC" ? "USDC (dollars)" : "MON (fees)"}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="send-to" className="text-[13px] text-ink-2">
              To
            </label>
            <input
              id="send-to"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-invalid={!!toError}
              aria-describedby={toError ? "send-to-error" : undefined}
              className="mt-2 h-11 w-full rounded-[12px] bg-surface px-4 font-mono text-[14px] ring-1 ring-hairline focus:ring-primary"
            />
            {toError && (
              <p id="send-to-error" role="alert" className="mt-2 text-[13px] text-error">
                {toError}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="send-amount" className="text-[13px] text-ink-2">
                Amount
              </label>
              <span className="text-[13px] text-ink-3">
                Available: {balance === undefined ? "..." : `${fmt(balance, decimals)} ${asset}`}
              </span>
            </div>
            <div className="relative mt-2">
              <input
                id="send-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder={asset === "USDC" ? "5.00" : "0.1"}
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value.replace(",", "."))}
                aria-invalid={!!amountError}
                aria-describedby={amountError ? "send-amount-error" : undefined}
                className="h-11 w-full rounded-[12px] bg-surface pr-20 pl-4 font-mono text-[16px] ring-1 ring-hairline focus:ring-primary"
              />
              <button
                type="button"
                onClick={max}
                disabled={!balance}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white px-3 py-1 text-[13px] text-primary-ink ring-1 ring-hairline disabled:opacity-50"
              >
                Max
              </button>
            </div>
            {amountError && (
              <p id="send-amount-error" role="alert" className="mt-2 text-[13px] text-error">
                {amountError}
              </p>
            )}
          </div>
          {noGas && (
            <p role="alert" className="rounded-[12px] bg-[rgba(180,88,11,0.08)] px-4 py-3 text-[14px] text-warning">
              You need a little MON to pay the network fee before you can send. Ask whoever funded this wallet, or use Receive to get some.
            </p>
          )}
          <button
            type="submit"
            disabled={!ready}
            className="h-12 w-full rounded-full bg-primary text-[16px] font-[450] text-white hover:bg-primary-ink disabled:bg-surface disabled:text-ink-3 disabled:ring-1 disabled:ring-hairline"
          >
            Review
          </button>
        </form>
      ) : (
        <div className="mt-5">
          <dl className="space-y-3 rounded-[14px] bg-surface p-4 text-[14px] ring-1 ring-hairline">
            <Row k="You send" v={`${fmt(amount!, decimals)} ${asset}`} strong />
            <Row k="To" v={<span className="font-mono break-all">{getAddress(toTrim)}</span>} />
            <Row k="Network fee" v={fee === undefined ? "..." : `about ${fmt(fee, 18)} MON`} />
            <Row k="Network" v="Monad mainnet" />
          </dl>
          <p className="mt-3 text-[13px] leading-[1.5] text-ink-2">
            Check the first and last few characters of the address. Money sent to the wrong address can&apos;t be recovered.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setReview(false)}
              className="h-12 rounded-full bg-white text-[15px] ring-1 ring-hairline hover:bg-surface disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={send}
              className="h-12 rounded-full bg-primary text-[15px] font-[450] text-white hover:bg-primary-ink disabled:opacity-60"
            >
              {busy ? "Sending..." : "Confirm and send"}
            </button>
          </div>
        </div>
      )}
      <div className="mt-4">
        <TxStatus state={tx.state} />
      </div>
    </section>
  );
}

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-ink-2">{k}</dt>
      <dd className={`text-right ${strong ? "font-mono text-[16px] font-[500]" : ""}`}>{v}</dd>
    </div>
  );
}

function ReceivePanel({ address }: { address: Address }) {
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toString(address, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#211d1d", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [address]);

  return (
    <section aria-labelledby="receive-title" className={`${card} p-6`}>
      <h2 id="receive-title" className="flex items-center gap-2 text-[17px] font-[450]">
        <QrCode size={17} aria-hidden="true" /> Receive money
      </h2>
      <p className="mt-1 text-[14px] leading-[1.5] text-ink-2">Share this address or let someone scan the code.</p>
      <div
        role="img"
        aria-label="QR code of your wallet address"
        className="mx-auto mt-5 aspect-square w-full max-w-[200px] [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mt-4 rounded-[12px] bg-surface px-4 py-3 text-center font-mono text-[13px] break-all ring-1 ring-hairline">{address}</p>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-[450] text-white hover:bg-primary-ink"
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? "Copied" : "Copy address"}
      </button>
      <p className="mt-4 rounded-[12px] bg-[rgba(180,88,11,0.08)] px-4 py-3 text-[13px] leading-[1.5] text-warning">
        Only send USDC or MON on the Monad network. Money sent from another network, like Ethereum or Base, won&apos;t arrive here.
      </p>
      <p className="mt-3 text-[13px] text-ink-3">
        Selling something? Your <Link href="/merchant" className="text-primary-ink underline-offset-2 hover:underline">payment link</Link> also builds your
        sales record.
      </p>
    </section>
  );
}

const labels: Record<Item["kind"], { title: (c: string) => string; icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }> }> = {
  paid: { title: (c) => `Paid ${c}`, icon: Store },
  sale: { title: (c) => `Sale from ${c}`, icon: Store },
  deposit: { title: () => "Added to lending pool", icon: PiggyBank },
  withdraw: { title: () => "Withdrew from lending pool", icon: Landmark },
  advance: { title: () => "Advance received", icon: HandCoins },
  sent: { title: (c) => `Sent to ${c}`, icon: ArrowUpRight },
  received: { title: (c) => `Received from ${c}`, icon: ArrowDownLeft },
};

function History({ address, q, view }: { address: Address; q: ReturnType<typeof useQuery<Item[]>>; view: ReturnType<typeof useViewAuth> }) {
  const [all, setAll] = useState(false);
  return (
    <section aria-labelledby="history-title" className={`${card} p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="history-title" className="text-[17px] font-[450]">
          Activity
        </h2>
        <button type="button" onClick={() => q.refetch()} disabled={q.isFetching} className="text-[13px] text-primary-ink disabled:text-ink-3">
          {q.isFetching ? "Updating..." : "Refresh"}
        </button>
      </div>
      {!view.authorized ? (
        <div className="mt-5 rounded-[14px] bg-surface p-5 text-[14px] leading-[1.55] text-ink-2">
          <p className="flex items-center gap-2 text-[15px] font-[450] text-ink">
            <Lock size={15} aria-hidden="true" /> Your activity is private
          </p>
          <p className="mt-1">Sign a quick message to show it. It proves the wallet is yours, costs nothing and moves no money.</p>
          <button
            type="button"
            onClick={view.authorize}
            disabled={view.signing}
            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-[14px] font-[450] text-white hover:bg-primary-ink disabled:opacity-60"
          >
            {view.signing ? "Waiting for your signature..." : "Show my activity"}
          </button>
          {view.failed && <p role="alert" className="mt-2 text-[13px] text-error">The signature was cancelled. Try again when you&apos;re ready.</p>}
        </div>
      ) : q.isPending ? (
        <ul className="mt-5 space-y-3" aria-label="Loading activity">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-14 animate-pulse rounded-[12px] bg-surface" />
          ))}
        </ul>
      ) : q.isError ? (
        <div className="mt-5 rounded-[14px] bg-surface p-5 text-[14px] text-ink-2">
          Couldn&apos;t load your activity from Monad.{" "}
          <button type="button" onClick={() => q.refetch()} className="text-primary-ink underline-offset-2 hover:underline">
            Try again
          </button>
        </div>
      ) : q.data!.length === 0 ? (
        <div className="mt-5 rounded-[14px] bg-surface p-5 text-[14px] leading-[1.55] text-ink-2">
          Nothing yet. Money you send, receive, lend or get paid will show up here.
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-hairline">
          {(all ? q.data! : q.data!.slice(0, 8)).map((it) => {
            const d = BigInt(it.delta);
            const L = labels[it.kind];
            const Icon = L.icon;
            return (
              <li key={it.hash}>
                <a href={txUrl(it.hash)} target="_blank" rel="noreferrer" className="-mx-2 flex items-center gap-3 rounded-[12px] px-2 py-3 hover:bg-surface">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-ink-2 ring-1 ring-hairline">
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{L.title(it.counterparty ? short(it.counterparty) : "")}</span>
                    <span className="block text-[12px] text-ink-3">
                      {it.time ? date(it.time) : "Just now"}
                      {it.repaid && it.repaid !== "0" ? ` · ${usdc(BigInt(it.repaid))} went to your advance` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 font-mono text-[15px] ${d > 0n ? "text-positive" : "text-ink"}`}>
                    {d > 0n ? "+" : d < 0n ? "-" : ""}
                    {usdc(d < 0n ? -d : d)}
                  </span>
                  <ExternalLink size={13} className="shrink-0 text-ink-3" aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {!all && (q.data?.length ?? 0) > 8 && (
        <button type="button" onClick={() => setAll(true)} className="mt-3 h-10 w-full rounded-full bg-surface text-[14px] text-ink ring-1 ring-hairline hover:bg-[#f1f0ee]">
          Show {q.data!.length - 8} more
        </button>
      )}
      <p className="mt-4 text-[12px] leading-[1.5] text-ink-3">
        USDC movements since Tillbook launched. Amounts in dollars. For MON and older history,{" "}
        <a href={addressUrl(address)} target="_blank" rel="noreferrer" className="text-primary-ink underline-offset-2 hover:underline">
          see Monadscan
        </a>
        .
      </p>
    </section>
  );
}

function parseMon(input: string): bigint | null {
  const s = input.trim();
  if (!/^\d+(\.\d{0,18})?$/.test(s)) return null;
  const v = parseEther(s);
  return v > 0n ? v : null;
}

function fmt(v: bigint, decimals: number) {
  return Number(formatUnits(v, decimals)).toLocaleString("en-US", { maximumFractionDigits: 6 });
}
