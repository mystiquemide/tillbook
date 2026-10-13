"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { boostFor, cappedVolume } from "@tillbook/underwriter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Coins,
  Fuel,
  HandCoins,
  PiggyBank,
  RotateCcw,
  ShoppingBag,
  Store,
  UserRound,
  Wallet,
} from "lucide-react";
import { card } from "@/components/app/Notice";
import { erc20Abi } from "@/lib/abi";
import { addresses } from "@/lib/chain";
import { useWalletConnect } from "@/lib/useWalletConnect";
import { privyEnabled } from "@/lib/wagmi";
import { markOnboarded } from "@/components/app/FirstRunTip";

const steps = ["The idea", "Try it", "Who does what", "Words you'll see", "Get started"] as const;

export function Onboarding() {
  const [step, setStep] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const go = (n: number) => {
    setStep(n);
    if (n === steps.length - 1) markOnboarded();
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={top} className="scroll-mt-24">
      <p className="text-[14px] text-primary-ink">Getting started · about 2 minutes</p>
      <h1 className="mt-2 text-[38px] leading-[1.1] font-[550] tracking-[-0.04em] md:text-[48px]">How Tillbook works</h1>
      <p className="mt-3 max-w-[620px] text-[16px] leading-[1.6] text-ink-2">
        No crypto knowledge needed. Click through at your own pace, and come back any time from the menu.
      </p>

      <nav aria-label="Walkthrough steps" className="mt-8">
        <ol className="grid grid-cols-5 gap-1.5">
          {steps.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === step ? "step" : undefined}
                className="group block w-full text-left"
              >
                <span className={`block h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-hairline group-hover:bg-[#d9d6d2]"}`} />
                <span className={`mt-2 hidden text-[13px] md:block ${i === step ? "text-ink" : "text-ink-3"}`}>
                  {i + 1}. {s}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[13px] text-ink-3 md:hidden">
          Step {step + 1} of {steps.length}: {steps[step]}
        </p>
      </nav>

      <div key={step} className="rise mt-8">
        {step === 0 && <Idea />}
        {step === 1 && <Simulator />}
        {step === 2 && <Roles />}
        {step === 3 && <Words />}
        {step === 4 && <GetStarted />}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] ring-1 ring-hairline hover:bg-surface disabled:invisible"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        {step < steps.length - 1 && (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-[450] text-white hover:bg-primary-ink"
          >
            Next: {steps[step + 1]}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${card} p-6 md:p-8 ${className}`}>{children}</div>;
}

/* Step 1 */

function Idea() {
  const cards: [ComponentType<{ size?: number }>, string, string][] = [
    [Store, "Small shops need cash to grow", "Stock for a busy season, a new oven, a second chair. Waiting months for a bank isn't an option."],
    [HandCoins, "Today's options are a black box", "Payment companies offer loans with no reason given, then take a fixed amount every day, even on days with no sales."],
    [Check, "Tillbook uses your sales instead", "Every sale you take through Tillbook is recorded in public. That record is what lenders look at, and it belongs to you."],
  ];
  return (
    <div className="space-y-6">
      <Panel>
        <p className="text-[22px] leading-[1.35] font-[500] tracking-[-0.02em] md:text-[26px]">
          Tillbook lets a shop get paid, get a cash advance based on its sales, and pay it back a little from each sale.
          No fixed payments and no due dates.
        </p>
      </Panel>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([Icon, title, body]) => (
          <Panel key={title} className="!p-6">
            <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-primary-tint text-primary-ink" aria-hidden="true">
              <Icon size={20} />
            </span>
            <p className="mt-4 text-[17px] font-[450]">{title}</p>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-2">{body}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* Step 2: a pretend shop that runs the real offer formula */

const customers = ["Ada", "Ben", "Chioma", "Dev"];
const SALE = 20;

function Simulator() {
  const [sales, setSales] = useState<{ who: string; amount: number; repaid: number }[]>([]);
  const [cash, setCash] = useState(0);
  const [owed, setOwed] = useState(0);
  const [repaidCount, setRepaidCount] = useState(0);
  const [taken, setTaken] = useState(false);
  const [startOwed, setStartOwed] = useState(0);
  const [message, setMessage] = useState("Tap “A customer pays” to make your first sale.");

  // The same capping and boost the live underwriter uses, applied to these pretend sales.
  const perPayer = new Map<string, bigint>();
  for (const s of sales) perPayer.set(s.who, (perPayer.get(s.who) ?? 0n) + BigInt(s.amount * 100));
  const distinct = perPayer.size;
  const { capped } = cappedVolume(perPayer);
  const boost = Number(boostFor(BigInt(repaidCount))) / 10_000;
  const offer = distinct >= 3 && !taken ? Math.round((Number(capped) / 100) * 0.5 * boost * 100) / 100 : 0;

  function sale() {
    const who = customers[sales.length % customers.length];
    const repaid = taken ? Math.min(owed, SALE * 0.1) : 0;
    setSales((s) => [...s, { who, amount: SALE, repaid }]);
    setCash((c) => c + SALE - repaid);
    if (taken) {
      const left = Math.max(0, Math.round((owed - repaid) * 100) / 100);
      setOwed(left);
      if (left === 0) {
        setTaken(false);
        setRepaidCount((n) => n + 1);
        setMessage("Paid off. Your next offer is 25% bigger because you repaid this one.");
      } else setMessage(`${who} paid $${SALE}. $${(SALE - repaid).toFixed(2)} reached you and $${repaid.toFixed(2)} paid down the advance.`);
    } else {
      const n = new Set([...sales.map((s) => s.who), who]).size;
      setMessage(n < 3 ? `${who} paid $${SALE}. ${3 - n} more different customer${3 - n === 1 ? "" : "s"} until you get an offer.` : `${who} paid $${SALE}. You have an offer.`);
    }
  }

  function take() {
    setTaken(true);
    setCash((c) => c + offer);
    setOwed(Math.round(offer * 1.06 * 100) / 100);
    setStartOwed(Math.round(offer * 1.06 * 100) / 100);
    setSales([]);
    setMessage(`$${offer.toFixed(2)} landed in your wallet. You owe $${(offer * 1.06).toFixed(2)}, the advance plus a flat 6% fee. Now keep selling.`);
  }

  function reset() {
    setSales([]);
    setCash(0);
    setOwed(0);
    setRepaidCount(0);
    setTaken(false);
    setMessage("Tap “A customer pays” to make your first sale.");
  }

  const progress = taken && startOwed ? 1 - owed / startOwed : 0;

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[19px] font-[500]">Run a pretend shop</p>
          <p className="mt-1 text-[14px] text-ink-2">Example numbers, nothing real moves. The offer uses Tillbook&apos;s actual formula.</p>
        </div>
        <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
          <RotateCcw size={14} aria-hidden="true" /> Start over
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Meter label="In your wallet" value={`$${cash.toFixed(2)}`} />
        <Meter label="Different customers" value={`${distinct} of 3`} done={distinct >= 3 || taken} />
        <Meter label={taken ? "Still owed" : "Advance offer"} value={taken ? `$${owed.toFixed(2)}` : offer ? `$${offer.toFixed(2)}` : "Not yet"} />
      </div>

      {taken && (
        <div className="mt-4" aria-hidden="true">
          <div className="h-2 overflow-hidden rounded-full bg-surface ring-1 ring-hairline">
            <div className="h-full rounded-full bg-positive transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-1 text-[12px] text-ink-3">{Math.round(progress * 100)}% repaid</p>
        </div>
      )}

      <p role="status" aria-live="polite" className="mt-5 rounded-[14px] bg-primary-tint px-4 py-3 text-[15px] leading-[1.5] text-primary-ink">
        {message}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={sale}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-[450] text-white hover:bg-[#3a3436]"
        >
          <ShoppingBag size={16} aria-hidden="true" /> A customer pays ${SALE}
        </button>
        {offer > 0 && (
          <button
            type="button"
            onClick={take}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-[450] text-white hover:bg-primary-ink"
          >
            <HandCoins size={16} aria-hidden="true" /> Take ${offer.toFixed(2)} advance
          </button>
        )}
      </div>

      {sales.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Recent sales">
          {sales.slice(-8).map((s, i) => (
            <li key={i} className="rise rounded-full bg-surface px-3 py-1.5 text-[13px] ring-1 ring-hairline">
              {s.who} ${s.amount}
              {s.repaid > 0 && <span className="text-ink-3"> · ${s.repaid.toFixed(2)} repaid</span>}
            </li>
          ))}
        </ul>
      )}

      <details className="mt-6 text-[14px] text-ink-2">
        <summary className="cursor-pointer text-ink">How the offer is worked out</summary>
        <p className="mt-2 leading-[1.6]">
          You need sales from at least 3 different customers in the last 30 days. Each customer counts for at most 20% of
          your total, so one big buyer can&apos;t inflate it. You&apos;re offered half of what counts, and each advance you
          repay raises the next one by 25%, up to double. While you owe, 10% of each sale pays it down. Slow day, small
          repayment.
        </p>
      </details>
    </Panel>
  );
}

function Meter({ label, value, done }: { label: string; value: string; done?: boolean }) {
  return (
    <div className="rounded-[14px] bg-surface p-4 ring-1 ring-hairline">
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className={`mt-1 font-mono text-[22px] font-[500] ${done ? "text-positive" : ""}`}>{value}</p>
    </div>
  );
}

/* Step 3 */

const roles = {
  merchant: {
    icon: Store,
    name: "Shop owner",
    gets: "Get paid, build a public sales record, and draw cash advances against it.",
    steps: [
      "Sign in with your email. Tillbook creates a wallet for you.",
      "Share your payment link or QR code with customers.",
      "After sales from 3 different customers, you get an advance offer. Take it if you want it.",
      "10% of each later sale pays it back automatically, until it's done.",
    ],
    needs: "A little MON for network fees, only when you take an advance.",
    href: "/merchant",
    cta: "Open the shop dashboard",
  },
  customer: {
    icon: UserRound,
    name: "Customer",
    gets: "Pay a shop in digital dollars. You see exactly where your money goes before you confirm.",
    steps: [
      "Open the link or scan the QR code the shop gives you.",
      "Sign in with your email if you don't have a wallet yet.",
      "Check the amount and confirm. It settles in about a second.",
    ],
    needs: "USDC to pay with, and a little MON for the network fee.",
    href: "/wallet",
    cta: "Set up my wallet",
  },
  lender: {
    icon: PiggyBank,
    name: "Lender",
    gets: "Put USDC in the shared pool and earn the 6% fee as shops repay their advances.",
    steps: [
      "Sign in and add USDC to your wallet.",
      "Deposit into the pool. You can see every advance it funds.",
      "Withdraw whatever isn't lent out, any time.",
    ],
    needs: "USDC to deposit and a little MON for fees. Shops can fail to repay, so only lend what you can afford to lose.",
    href: "/lend",
    cta: "See the lending pool",
  },
} as const;
type Role = keyof typeof roles;

function Roles() {
  const [role, setRole] = useState<Role>("merchant");
  const r = roles[role];
  return (
    <Panel>
      <div role="tablist" aria-label="Roles" className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1 ring-1 ring-hairline">
        {(Object.keys(roles) as Role[]).map((k) => {
          const Icon = roles[k].icon;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              id={`tab-${k}`}
              aria-selected={role === k}
              aria-controls="role-panel"
              onClick={() => setRole(k)}
              className={`inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-[14px] transition-colors ${
                role === k ? "bg-white font-[450] text-ink shadow-sm" : "text-ink-2 hover:text-ink"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {roles[k].name}
            </button>
          );
        })}
      </div>
      <div id="role-panel" role="tabpanel" aria-labelledby={`tab-${role}`} key={role} className="rise mt-6">
        <p className="text-[18px] leading-[1.5] font-[450]">{r.gets}</p>
        <ol className="mt-5 space-y-3">
          {r.steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-tint font-mono text-[13px] text-primary-ink">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[15px] leading-[1.55]">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-[12px] bg-surface px-4 py-3 text-[14px] leading-[1.5] text-ink-2 ring-1 ring-hairline">
          <span className="text-ink">You&apos;ll need:</span> {r.needs}
        </p>
        <FlowLine />
      </div>
    </Panel>
  );
}

function FlowLine() {
  const nodes: [ComponentType<{ size?: number }>, string][] = [
    [UserRound, "Customer pays"],
    [Store, "Shop gets 90%"],
    [PiggyBank, "10% repays the pool"],
    [Coins, "Lenders earn the fee"],
  ];
  return (
    <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="While a shop owes an advance, each payment splits like this">
      {nodes.map(([Icon, label], i) => (
        <div key={label} style={{ "--delay": `${i * 90}ms` } as React.CSSProperties} className="rise flex items-center gap-2 rounded-[12px] bg-white p-3 ring-1 ring-hairline">
          <Icon size={16} />
          <span className="text-[13px]">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* Step 4 */

const words: [string, string][] = [
  ["Wallet", "Your account for digital money. Signing in with email creates one. It has an address, like an account number, that you can share to get paid."],
  ["USDC", "A digital dollar. 1 USDC is always worth 1 US dollar. Everything on Tillbook is priced and paid in USDC."],
  ["MON", "The fuel for the Monad network. Every action costs a tiny network fee, usually a fraction of a cent, paid in MON."],
  ["Confirm", "Nothing moves until you approve it. Each payment or deposit asks you to confirm, and then it settles in about a second."],
  ["Address", "A long code starting with 0x that identifies a wallet. Always copy and paste it, and check the first and last few characters."],
  ["Advance", "Cash a shop gets now, against future sales. It's repaid from 10% of each sale, plus a flat 6% fee. No due date."],
  ["Lending pool", "The shared pot advances come from. Lenders put USDC in, and the fees from repaid advances go back to them."],
  ["Monad", "The public network Tillbook runs on. Every sale and repayment is recorded there, so anyone can check it."],
];

function Words() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {words.map(([w, d], i) => (
        <div key={w} className={`${card} overflow-hidden`}>
          <button
            type="button"
            aria-expanded={open === i}
            aria-controls={`word-${i}`}
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          >
            <span className="text-[16px] font-[450]">{w}</span>
            <ChevronDown size={16} className={`text-ink-3 transition-transform ${open === i ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {open === i && (
            <p id={`word-${i}`} className="rise px-5 pb-5 text-[15px] leading-[1.6] text-ink-2">
              {d}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* Step 5: a live checklist read from the person's own wallet */

function GetStarted() {
  const [role, setRole] = useState<Role>("merchant");
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useWalletConnect();
  const mon = useBalance({ address, query: { enabled: !!address } });
  const usdcBal = useReadContract({
    address: addresses.token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const hasMon = (mon.data?.value ?? 0n) > 0n;
  const hasUsdc = ((usdcBal.data as bigint | undefined) ?? 0n) > 0n;
  const r = roles[role];

  useEffect(() => markOnboarded(), []);

  const items: { done: boolean; title: string; body: string; action?: ReactNode; skip?: boolean }[] = [
    {
      done: isConnected,
      title: privyEnabled ? "Sign in" : "Connect a wallet",
      body: privyEnabled ? "Use your email or Google. A wallet is created for you." : "Use MetaMask, Rabby or any browser wallet.",
      action: !isConnected && (
        <button type="button" onClick={connect} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-[14px] text-white disabled:opacity-60">
          {isPending ? "Connecting..." : privyEnabled ? "Sign in" : "Connect"}
        </button>
      ),
    },
    {
      done: isConnected && hasMon,
      title: "Get a little MON for fees",
      body: isConnected
        ? hasMon
          ? "You have MON for network fees."
          : "Ask a friend or exchange to send a small amount of MON to your address."
        : "Each action costs a fraction of a cent.",
      action: isConnected && !hasMon && <ActionLink href="/wallet">Show my address</ActionLink>,
    },
    {
      done: isConnected && hasUsdc,
      title: role === "merchant" ? "USDC comes from your sales" : "Add USDC",
      body:
        role === "merchant"
          ? "You don't need any to start. Customers pay you in USDC."
          : isConnected
            ? hasUsdc
              ? "You have USDC ready."
              : "Have USDC on Monad sent to your wallet address."
            : "Digital dollars, 1 USDC = $1.",
      action: isConnected && !hasUsdc && role !== "merchant" && <ActionLink href="/wallet">Receive USDC</ActionLink>,
      skip: role === "merchant",
    },
    {
      done: false,
      title: role === "merchant" ? "Share your payment link" : role === "lender" ? "Make your first deposit" : "Pay a shop",
      body:
        role === "customer"
          ? "Open the payment link or QR code a shop shares with you. You'll see the split before you confirm."
          : role === "merchant"
            ? "Copy your link or QR code and send it to your first customers."
            : "Start small. You can withdraw anything that isn't lent out.",
      action: <ActionLink href={r.href}>{role === "customer" ? "Open my wallet" : r.cta}</ActionLink>,
    },
  ];

  return (
    <Panel>
      <p className="text-[19px] font-[500]">Your first transaction</p>
      <p className="mt-1 text-[14px] text-ink-2">Pick what you want to do. The checklist updates from your real wallet.</p>
      <div role="radiogroup" aria-label="I want to" className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(Object.keys(roles) as Role[]).map((k) => {
          const Icon = roles[k].icon;
          const label = k === "merchant" ? "Get paid and funded" : k === "lender" ? "Lend and earn" : "Pay a shop";
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={role === k}
              onClick={() => setRole(k)}
              className={`flex items-center gap-3 rounded-[14px] p-4 text-left ring-1 transition-colors ${
                role === k ? "bg-primary-tint ring-primary" : "bg-white ring-hairline hover:bg-surface"
              }`}
            >
              <Icon size={18} />
              <span className="text-[15px] font-[450]">{label}</span>
            </button>
          );
        })}
      </div>
      <ol className="mt-6 space-y-3">
        {items.map((it, i) => (
          <li key={it.title} className="flex items-start gap-4 rounded-[14px] bg-surface p-4 ring-1 ring-hairline">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] ${
                it.done ? "bg-positive text-white" : it.skip ? "bg-white text-ink-3 ring-1 ring-hairline" : "bg-white font-mono text-ink-2 ring-1 ring-hairline"
              }`}
              aria-label={it.done ? "Done" : it.skip ? "Not needed" : `Step ${i + 1}`}
            >
              {it.done ? <Check size={16} aria-hidden="true" /> : it.skip ? "–" : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] font-[450] ${it.done ? "text-ink-2" : ""}`}>{it.title}</p>
              <p className="mt-0.5 text-[14px] leading-[1.5] text-ink-2">{it.body}</p>
            </div>
            {!it.done && it.action && <div className="shrink-0 self-center">{it.action}</div>}
          </li>
        ))}
      </ol>
      <p className="mt-5 flex items-center gap-2 text-[13px] text-ink-3">
        <Wallet size={14} aria-hidden="true" /> <Fuel size={14} aria-hidden="true" />
        Your balances are read live from Monad. Nothing moves until you confirm.
      </p>
    </Panel>
  );
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[14px] text-white hover:bg-[#3a3436]">
      {children} <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}
