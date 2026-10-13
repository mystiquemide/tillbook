import Link from "next/link";
import type { ReactNode } from "react";
import { Callout, Code, Table } from "./ui";

export type Section = { id: string; title: string; body: ReactNode };
export type DocPage = { slug: string; title: string; description: string; sections: Section[] };
export type DocGroup = { title: string; pages: DocPage[] };

const POOL = "0x317E89b89aeE6af8c1fD6AaceF06daaD733EFFaE";
const ROUTER = "0x380A8e5A6BbE708E17397f3c31Cb806bfd920853";
const USDC = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
const SIGNER = "0x77fB8bc19CB9fc116701b23309287b2d8F577A4A";
const scan = (a: string) => `https://monadscan.com/address/${a}`;
const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
    {children}
  </a>
);

export const groups: DocGroup[] = [
  {
    title: "Getting started",
    pages: [
      {
        slug: "",
        title: "Introduction",
        description: "Tillbook is merchant credit on Monad. Sales become a credit record the merchant owns, and each sale repays a little of any advance.",
        sections: [
          {
            id: "what-is-tillbook",
            title: "What is Tillbook",
            body: (
              <>
                <p>
                  Tillbook is revenue-based financing for small merchants, built on Monad. Merchants take payments in USDC.
                  Every sale is recorded onchain and becomes a credit record the merchant owns. A shared lending pool funds
                  cash advances against that record, and 10% of each later sale repays the advance inside the same payment.
                </p>
                <p>There are no fixed payments and no due dates. A slow day means a small repayment, and no sales means none.</p>
              </>
            ),
          },
          {
            id: "who-its-for",
            title: "Who it's for",
            body: (
              <Table
                head={["Role", "What they do", "What they get"]}
                rows={[
                  ["Merchant", "Shares a payment link or QR code and takes USDC", "A sales record and advances priced from it"],
                  ["Customer", "Pays a merchant from any wallet or an email sign-in", "A clear split preview before every payment"],
                  ["Lender", "Deposits USDC into the pool", "A flat 6% fee on every advance, paid as merchants repay"],
                ]}
              />
            ),
          },
          {
            id: "why-it-exists",
            title: "Why it exists",
            body: (
              <p>
                Small merchants usually get financing from whoever processes their payments. Offers are a black box, refusals
                come without a reason, and cash advances take fixed daily debits whether the shop sold anything or not. The
                merchant&apos;s history stays locked inside one platform. Tillbook keeps that history onchain, prices offers with
                a public formula, and lets repayment follow real revenue.
              </p>
            ),
          },
          {
            id: "status",
            title: "Status",
            body: (
              <>
                <p>
                  Tillbook is live on Monad mainnet with verified contracts. A full loop has run with real USDC: a lender
                  deposit, payments from three customers, a signed advance and an in-sale repayment.
                </p>
                <Callout>
                  New to crypto? The <Link href="/start">2-minute walkthrough</Link> explains everything with a hands-on example.
                </Callout>
              </>
            ),
          },
        ],
      },
      {
        slug: "quickstart",
        title: "Quickstart",
        description: "Make your first payment, deposit or advance in a few minutes.",
        sections: [
          {
            id: "before-you-start",
            title: "Before you start",
            body: (
              <ul>
                <li>
                  <strong>A wallet.</strong> Sign in with email or Google and Tillbook creates one for you, or use any browser
                  wallet.
                </li>
                <li>
                  <strong>A little MON.</strong> Every action pays a small Monad network fee, usually a fraction of a cent.
                </li>
                <li>
                  <strong>USDC on Monad</strong>, if you&apos;re paying or lending. Merchants don&apos;t need any to start.
                </li>
              </ul>
            ),
          },
          {
            id: "pay-a-merchant",
            title: "Pay a merchant",
            body: (
              <ol>
                <li>Open the payment link or scan the QR code the merchant shares.</li>
                <li>Sign in, check the amount and the split preview, and confirm.</li>
                <li>Confirm twice the first time: once to allow USDC, then the payment itself.</li>
              </ol>
            ),
          },
          {
            id: "get-paid",
            title: "Get paid and funded",
            body: (
              <ol>
                <li>
                  Sign in at <Link href="/merchant">/merchant</Link> and copy your payment link or QR code.
                </li>
                <li>Collect sales from at least three different customers.</li>
                <li>Your offer appears with every input shown. Draw it and the USDC lands in your wallet.</li>
                <li>Keep selling. 10% of each sale repays the advance until it&apos;s cleared.</li>
              </ol>
            ),
          },
          {
            id: "lend",
            title: "Lend",
            body: (
              <ol>
                <li>
                  Sign in at <Link href="/lend">/lend</Link> and enter an amount.
                </li>
                <li>Check the review: the shares you receive, your position after, and the network.</li>
                <li>Confirm. You can withdraw anything that isn&apos;t lent out at any time.</li>
              </ol>
            ),
          },
        ],
      },
    ],
  },
  {
    title: "Product",
    pages: [
      {
        slug: "how-it-works",
        title: "How it works",
        description: "The payment split, the advance and the repayment loop.",
        sections: [
          {
            id: "the-loop",
            title: "The loop",
            body: (
              <>
                <Code>{`Customer ──pay()──► SplitRouter ──10% while an advance is open──► LenderPool
                         └──────────────── the rest ────────────► Merchant

Lender ──deposit──► LenderPool ──advance──► Merchant   (offer signed by the underwriter)`}</Code>
                <ol>
                  <li>
                    <strong>Get paid.</strong> Customers pay through the merchant&apos;s link. <code>SplitRouter</code> moves the
                    USDC and emits a <code>Payment</code> event.
                  </li>
                  <li>
                    <strong>Get an offer.</strong> The underwriter reads those events and prices an advance with a public
                    formula.
                  </li>
                  <li>
                    <strong>Draw it.</strong> The merchant submits the signed offer to <code>LenderPool</code>.
                  </li>
                  <li>
                    <strong>Repay as you sell.</strong> While the advance is open, 10% of each sale goes to the pool in the
                    same transaction.
                  </li>
                  <li>
                    <strong>Grow.</strong> Each advance repaid in full raises the next offer, up to 2×.
                  </li>
                </ol>
              </>
            ),
          },
          {
            id: "fees",
            title: "Fees",
            body: (
              <Table
                head={["Who", "Pays"]}
                rows={[
                  ["Customer", "The payment amount and a Monad network fee"],
                  ["Merchant", "Nothing to accept payments. A flat 6% fee only when drawing an advance"],
                  ["Lender", "Network fees to deposit and withdraw"],
                ]}
              />
            ),
          },
        ],
      },
      {
        slug: "offer-formula",
        title: "The offer formula",
        description: "Exactly how an advance is sized. Every input is shown to the merchant.",
        sections: [
          {
            id: "formula",
            title: "Formula",
            body: (
              <Code>{`eligible   at least 3 different customers in the last 30 days, own payments excluded
volume     each customer counts for at most 20% of the total
amount     min(volume × 50% × boost, 5,000 USDC, free pool liquidity)
boost      1 + 0.25 per advance repaid in full, up to 2×
fee        6% of the amount, flat
holdback   10% of each sale until repaid
expiry     15 minutes`}</Code>
            ),
          },
          {
            id: "worked-example",
            title: "Worked example",
            body: (
              <>
                <p>A merchant sold 100, 60 and 40 USDC to three different customers this month, and has never had an advance.</p>
                <ul>
                  <li>Total volume is 200. Each customer counts for at most 20%, which is 40.</li>
                  <li>Counted volume is 40 + 40 + 40 = 120.</li>
                  <li>The offer is 50% of 120 = 60 USDC, with a fee of 3.60.</li>
                  <li>After repaying it, the next offer from the same sales would be 75 USDC (1.25× boost).</li>
                </ul>
              </>
            ),
          },
          {
            id: "why-these-rules",
            title: "Why these rules",
            body: (
              <ul>
                <li>
                  <strong>Three customers and a 20% cap</strong> stop a merchant from inflating volume by paying themselves or
                  using one friendly buyer.
                </li>
                <li>
                  <strong>50% of volume</strong> keeps advances well inside what sales can repay.
                </li>
                <li>
                  <strong>The boost</strong> rewards merchants who repay, so the record compounds.
                </li>
              </ul>
            ),
          },
          {
            id: "source",
            title: "Source",
            body: (
              <p>
                The formula lives in{" "}
                <A href="https://github.com/mystiquemide/tillbook/blob/main/underwriter/src/formula.ts">underwriter/src/formula.ts</A>
                . The <Link href="/start">walkthrough</Link> runs the same code on example sales.
              </p>
            ),
          },
        ],
      },
      {
        slug: "merchants",
        title: "For merchants",
        description: "Payment links, the ledger, offers and repayment.",
        sections: [
          {
            id: "payment-requests",
            title: "Payment requests",
            body: (
              <p>
                Your dashboard builds a payment link and QR code. Add an amount and customers see it pre-filled
                (<code>/pay/your-address?amount=25.50</code>). You can copy, download, or share the request, and preview what
                customers see.
              </p>
            ),
          },
          {
            id: "ledger",
            title: "Ledger and record",
            body: (
              <p>
                Every sale paid through Tillbook appears in your ledger with its transaction. You can export it as CSV.
                Your record page at <code>/m/your-address</code> is the link you share with a lender to show the same history.
              </p>
            ),
          },
          {
            id: "drawing",
            title: "Drawing an advance",
            body: (
              <p>
                Offers are signed for 15 minutes and only your wallet can draw them. You need a little MON for the network fee.
                One advance can be open at a time. A new one becomes available after the last is repaid.
              </p>
            ),
          },
        ],
      },
      {
        slug: "lenders",
        title: "For lenders",
        description: "Depositing, earning and withdrawing.",
        sections: [
          {
            id: "how-you-earn",
            title: "How you earn",
            body: (
              <p>
                The pool is an ERC-4626 vault. You receive shares for your deposit. Every advance carries a flat 6% fee, and as
                merchants repay, those fees raise the value of each share. Returns come from merchant revenue, not token
                emissions.
              </p>
            ),
          },
          {
            id: "withdrawing",
            title: "Withdrawing",
            body: (
              <p>
                You can withdraw any part of your position that isn&apos;t lent out. If most of the pool is in active advances,
                your withdrawal limit is the free liquidity until merchants repay.
              </p>
            ),
          },
          {
            id: "risk",
            title: "Risk",
            body: (
              <Callout tone="warning">
                Lenders carry default risk. There&apos;s no collateral or collections, and the pool absorbs losses if a
                merchant stops selling. Only lend what you can afford to lose. See <Link href="/risks">Risks and privacy</Link>.
              </Callout>
            ),
          },
        ],
      },
      {
        slug: "wallet",
        title: "Wallet",
        description: "Balances, sending, receiving, history and key backup.",
        sections: [
          {
            id: "overview",
            title: "Overview",
            body: (
              <p>
                <Link href="/wallet">/wallet</Link> shows your balance in dollars: USDC plus your lending deposit, with MON shown
                separately for network fees. Everything is read live from Monad.
              </p>
            ),
          },
          {
            id: "send-receive",
            title: "Send and receive",
            body: (
              <ul>
                <li>Send USDC or MON with a review step showing the fee and network.</li>
                <li>Invalid addresses, your own address and Tillbook&apos;s contract addresses are blocked.</li>
                <li>Receive with a QR code and a copy button. Only send on the Monad network.</li>
              </ul>
            ),
          },
          {
            id: "activity",
            title: "Activity",
            body: (
              <p>
                Activity lists USDC movements since Tillbook launched, each labelled from the Tillbook events in the same
                transaction: payment, sale, deposit, withdrawal, advance, sent or received.
              </p>
            ),
          },
          {
            id: "key-export",
            title: "Key backup",
            body: (
              <p>
                Wallets created at sign-in can export their private key after a fresh sign-in and an explicit warning. The key
                is shown in Privy&apos;s isolated window, so Tillbook&apos;s code never sees it. Browser wallets keep their own
                keys and are backed up from that wallet.
              </p>
            ),
          },
        ],
      },
    ],
  },
  {
    title: "Protocol",
    pages: [
      {
        slug: "contracts",
        title: "Contracts",
        description: "Deployed addresses, functions, events and errors.",
        sections: [
          {
            id: "addresses",
            title: "Addresses",
            body: (
              <>
                <Table
                  head={["Contract", "Address"]}
                  rows={[
                    ["LenderPool", <A key="p" href={scan(POOL)}><code>{POOL}</code></A>],
                    ["SplitRouter", <A key="r" href={scan(ROUTER)}><code>{ROUTER}</code></A>],
                    ["Underwriter signer", <code key="s">{SIGNER}</code>],
                    ["USDC", <A key="u" href={scan(USDC)}><code>{USDC}</code></A>],
                  ]}
                />
                <p>Monad mainnet, chain 143. Pool deploy block 112997981. Source verified on Sourcify.</p>
              </>
            ),
          },
          {
            id: "lenderpool",
            title: "LenderPool",
            body: (
              <>
                <p>
                  ERC-4626 vault over USDC (share token <code>tbUSDC</code>). Pays advances against EIP-712 offers and takes
                  repayments.
                </p>
                <Table
                  head={["Function", "Purpose"]}
                  rows={[
                    [<code key="1">requestAdvance(Offer, bytes)</code>, "Draw a signed offer. Only the named merchant can call it"],
                    [<code key="2">repay(merchant, amount)</code>, "Repay part of an advance. Called by the router during payments"],
                    [<code key="3">advanceOf(merchant)</code>, "Owed, principal, holdback and whether it's active"],
                    [<code key="4">idle()</code>, "USDC in the pool that isn't lent out"],
                    [<code key="5">deposit / withdraw / redeem</code>, "Standard ERC-4626, with withdrawals limited to idle liquidity"],
                  ]}
                />
              </>
            ),
          },
          {
            id: "splitrouter",
            title: "SplitRouter",
            body: (
              <Table
                head={["Function", "Purpose"]}
                rows={[
                  [<code key="1">pay(merchant, amount, ref)</code>, "Pay a merchant. Sends the holdback to the pool when an advance is open"],
                  [<code key="2">quote(merchant, amount)</code>, "How a payment would split, before sending it"],
                ]}
              />
            ),
          },
          {
            id: "events",
            title: "Events",
            body: (
              <Code>{`Payment(address indexed merchant, address indexed payer, uint256 amount, uint256 repaid, bytes32 ref)
AdvanceDrawn(address indexed merchant, uint256 amount, uint256 fee, uint16 holdbackBps, uint256 nonce)
Repaid(address indexed merchant, address indexed payer, uint256 amount, uint256 owedAfter)
AdvanceRepaid(address indexed merchant, uint256 repaidCount)`}</Code>
            ),
          },
          {
            id: "errors",
            title: "Errors",
            body: (
              <Table
                head={["Error", "Meaning"]}
                rows={[
                  ["NotMerchant", "The caller isn't the merchant named in the offer"],
                  ["OfferExpired", "The 15-minute window passed"],
                  ["BadNonce", "The offer was already used"],
                  ["BadSignature", "Not signed by the underwriter"],
                  ["AdvanceActive", "The merchant already has an open advance"],
                  ["AboveMaxAdvance", "Above the 5,000 USDC cap"],
                  ["InsufficientLiquidity", "The pool doesn't have enough free USDC"],
                  ["InvalidMerchant", "Payment to the pool or router address"],
                ]}
              />
            ),
          },
        ],
      },
      {
        slug: "offers",
        title: "Signed offers",
        description: "The EIP-712 offer the underwriter signs and the pool verifies.",
        sections: [
          {
            id: "typed-data",
            title: "Typed data",
            body: (
              <Code>{`domain   { name: "Tillbook", version: "1", chainId: 143, verifyingContract: LenderPool }

Offer(address merchant, uint256 amount, uint256 fee, uint16 holdbackBps, uint256 nonce, uint256 expiry)`}</Code>
            ),
          },
          {
            id: "checks",
            title: "What the pool checks",
            body: (
              <ul>
                <li>The caller is the merchant in the offer.</li>
                <li>The offer hasn&apos;t expired and its nonce matches the merchant&apos;s next nonce.</li>
                <li>The fee doesn&apos;t exceed the amount and the holdback is between 1 and 5,000 basis points.</li>
                <li>The amount is within the 5,000 USDC cap and the pool&apos;s free liquidity.</li>
                <li>The merchant has no open advance, and the signature recovers to the underwriter.</li>
              </ul>
            ),
          },
          {
            id: "parity",
            title: "Parity",
            body: (
              <p>
                A test suite proves offers signed by the TypeScript underwriter produce the same EIP-712 digest in Solidity and
                are accepted by <code>requestAdvance</code>.
              </p>
            ),
          },
        ],
      },
      {
        slug: "security",
        title: "Security model",
        description: "What can and can't move funds.",
        sections: [
          {
            id: "guarantees",
            title: "Guarantees",
            body: (
              <ul>
                <li>
                  <strong>No admin keys.</strong> No owner, no pause, no upgrades. Funds move only by the contract rules.
                </li>
                <li>
                  <strong>The underwriter can only sign offers.</strong> It can&apos;t move pool funds. Each offer is bound to
                  one merchant, one pool and one chain, used once, and expires in 15 minutes.
                </li>
                <li>
                  <strong>Hard cap.</strong> No advance can exceed 5,000 USDC, which bounds the damage from a leaked signing key.
                </li>
                <li>
                  <strong>One open advance per merchant.</strong>
                </li>
                <li>
                  <strong>Inflation-resistant vault</strong> with a 6-decimal share offset.
                </li>
                <li>
                  <strong>The router checks its own work.</strong> It refuses payments to the pool or router and verifies the
                  pool&apos;s repay result.
                </li>
              </ul>
            ),
          },
          {
            id: "testing",
            title: "Testing",
            body: (
              <Table
                head={["Suite", "Count"]}
                rows={[
                  ["Solidity unit, guard and parity", "102"],
                  ["Solidity fuzz (1,000 runs each)", "20"],
                  ["Solidity invariants (256 runs × 64 calls)", "7"],
                  ["Mainnet fork against live USDC", "2"],
                  ["Underwriter (TypeScript)", "1,202"],
                  ["Envio indexer handlers", "3"],
                ]}
              />
            ),
          },
          {
            id: "reporting",
            title: "Reporting a vulnerability",
            body: (
              <p>
                Please report privately through{" "}
                <A href="https://github.com/mystiquemide/tillbook/security">GitHub security advisories</A>.
              </p>
            ),
          },
        ],
      },
      {
        slug: "privacy",
        title: "Privacy",
        description: "What Tillbook shows, and what the chain shows.",
        sections: [
          {
            id: "what-we-show",
            title: "What Tillbook shows",
            body: (
              <ul>
                <li>Pool size, lender balances and advance amounts aren&apos;t displayed on Tillbook&apos;s pages or APIs.</li>
                <li>The advances list shows only each advance&apos;s number and whether it&apos;s repaid.</li>
                <li>Public statistics are counts only: payments, merchants, advances and repaid advances.</li>
                <li>Merchants choose to share their sales record through their record link.</li>
              </ul>
            ),
          },
          {
            id: "onchain",
            title: "Onchain data",
            body: (
              <Callout tone="warning">
                Monad is a public blockchain. Contract events, balances and transfers can be read by anyone through an explorer.
                Tillbook doesn&apos;t display them, but it can&apos;t hide them.
              </Callout>
            ),
          },
        ],
      },
    ],
  },
  {
    title: "Developers",
    pages: [
      {
        slug: "architecture",
        title: "Architecture",
        description: "How the app, underwriter, indexer and contracts fit together.",
        sections: [
          {
            id: "components",
            title: "Components",
            body: (
              <Table
                head={["Layer", "Built with", "Role"]}
                rows={[
                  ["Contracts", "Solidity, Foundry, OpenZeppelin", "Hold funds and enforce every rule"],
                  ["Underwriter", "TypeScript, viem", "Prices offers and signs them with EIP-712"],
                  ["Indexer", "Envio HyperIndex", "Tracks payments, advances, repayments and lender flows"],
                  ["App", "Next.js, wagmi, Privy", "Merchant, checkout, lending, wallet and proof pages"],
                  ["RPC", "Alchemy, public Monad RPC", "Contract reads with automatic fallback"],
                ]}
              />
            ),
          },
          {
            id: "data-flow",
            title: "Data flow",
            body: (
              <p>
                The app reads history from Envio when the indexer is within 25 blocks of the chain head, and falls back to
                scanning contract logs otherwise. Responses carry an <code>x-data-source</code> header saying which was used.
                Offers are priced server-side from that history and signed with the underwriter key.
              </p>
            ),
          },
        ],
      },
      {
        slug: "api",
        title: "API reference",
        description: "Public HTTP endpoints served by the app.",
        sections: [
          {
            id: "endpoints",
            title: "Endpoints",
            body: (
              <Table
                head={["Endpoint", "Returns"]}
                rows={[
                  [<code key="1">GET /api/merchant/:address</code>, "Sales history, offer inputs and, when eligible, a signed offer"],
                  [<code key="2">GET /api/advances</code>, "Each advance's number and repaid status"],
                  [<code key="3">GET /api/stats</code>, "Counts of payments, merchants, advances and repaid advances"],
                  [<code key="4">GET /api/wallet/:address</code>, "Labelled USDC activity since launch. Owner only: needs a signature"],
                  [<code key="5">GET /api/lender/:address</code>, "USDC a lender has deposited and withdrawn. Owner only: needs a signature"],
                ]}
              />
            ),
          },
          {
            id: "errors",
            title: "Errors",
            body: (
              <p>
                Owner-only endpoints need two headers, <code>x-tillbook-expires</code> (a Unix time at most 24 hours ahead) and{" "}
                <code>x-tillbook-signature</code>, a signature over the message &ldquo;Tillbook: show my private activity&rdquo; with the
                address and expiry. Without a valid signature from that address they return <code>401</code>.{" "}
                Invalid addresses return <code>400</code> with <code>{"{ error: \"invalid_address\" }"}</code>. When Monad
                can&apos;t be reached the response is <code>502</code> with <code>rpc_unavailable</code>.
              </p>
            ),
          },
        ],
      },
      {
        slug: "run-locally",
        title: "Run locally",
        description: "Build, test and run every part of the repo.",
        sections: [
          {
            id: "commands",
            title: "Commands",
            body: (
              <Code>{`# contracts
cd contracts && forge test
MONAD_FORK=true forge test --match-path 'test/fork/*'

# underwriter
cd underwriter && npm install && npm test

# indexer
cd indexer && pnpm install && pnpm codegen && pnpm test

# app (reads the mainnet contracts)
cd web && npm install
cp ../.env.example .env.local   # add UNDERWRITER_PRIVATE_KEY to enable signed offers
npm run dev`}</Code>
            ),
          },
          {
            id: "deploy",
            title: "Deploy your own",
            body: (
              <>
                <Code>{`cd contracts
UNDERWRITER_ADDRESS=0x... forge script script/Deploy.s.sol \\
  --rpc-url https://rpc.monad.xyz --broadcast --private-key $DEPLOYER_PRIVATE_KEY`}</Code>
                <p>The script refuses to run on any chain except Monad mainnet and checks that the token is 6-decimal USDC.</p>
              </>
            ),
          },
        ],
      },
    ],
  },
  {
    title: "Resources",
    pages: [
      {
        slug: "limitations",
        title: "Limitations",
        description: "Known trade-offs, stated plainly.",
        sections: [
          {
            id: "known",
            title: "Known limitations",
            body: (
              <ul>
                <li>A merchant can take payments outside the router after drawing. It shows in their record and their next offer drops.</li>
                <li>Lenders carry default risk. There&apos;s no collateral or collections.</li>
                <li>The underwriter is a single signing key. The onchain cap limits what it can do.</li>
                <li>No KYC. A regulated version would need it.</li>
              </ul>
            ),
          },
          {
            id: "roadmap",
            title: "Roadmap",
            body: (
              <ul>
                <li>Point-of-sale plugins so existing checkouts can route USDC through the split.</li>
                <li>Decentralized underwriting, removing the single signing key.</li>
                <li>More stablecoins through a pool per asset.</li>
                <li>Multiple underwriters and pools competing on price for the same merchant record.</li>
              </ul>
            ),
          },
        ],
      },
      {
        slug: "glossary",
        title: "Glossary",
        description: "Every term you'll see, in plain words.",
        sections: [
          {
            id: "terms",
            title: "Terms",
            body: (
              <Table
                head={["Term", "Meaning"]}
                rows={[
                  ["Wallet", "Your account for digital money. Signing in with email creates one"],
                  ["USDC", "A digital dollar. 1 USDC is always worth 1 US dollar"],
                  ["MON", "Monad's native token, used to pay network fees"],
                  ["Advance", "Cash a merchant gets now against future sales"],
                  ["Holdback", "The 10% of each sale that repays an open advance"],
                  ["Lending pool", "The shared pot of lender USDC that advances come from"],
                  ["Underwriter", "The service that prices and signs offers"],
                  ["Boost", "The multiplier on the next offer earned by repaying in full"],
                ]}
              />
            ),
          },
        ],
      },
    ],
  },
];

export const pages = groups.flatMap((g) => g.pages);
export const findPage = (slug: string) => pages.find((p) => p.slug === slug);
