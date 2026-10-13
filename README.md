# Tillbook

**Your sales are your credit.** Merchants take USDC on Monad, every sale builds a public record, and any lender can fund an advance against it. A slice of each later sale repays the advance in the same transaction.

**[Open the app](https://tillbook.vercel.app)** · [Contracts on Monadscan](https://monadscan.com/address/0x317E89b89aeE6af8c1fD6AaceF06daaD733EFFaE) · [CI](https://github.com/mystiquemide/tillbook/actions)

![Merchant dashboard](web/public/screens/merchant.jpg)

## Why this exists

Small merchants get financing from whoever processes their payments, and the decision is a black box.

- A Shopify merchant who had repaid over £500,000 was refused £180,000 with no reason given. ([r/shopify](https://www.reddit.com/r/shopify/comments/1pyn2ic/shopify_capital_rejected_no_reason_provided_after/))
- A Stripe Capital offer fell from about $35,000 to $6,000 while the merchant's revenue grew. ([r/stripe](https://www.reddit.com/r/stripe/comments/1p1g2sb/stripe_capital_new_offer_update/))
- Merchant cash advances take fixed daily debits whether the shop sold anything that day or not.

The merchant's repayment history is locked inside one platform, so they can't take it anywhere else. Tillbook keeps that history onchain, where the merchant owns it and any lender can read it.

## How it works

```
Customer ──pay()──► SplitRouter ──10% while an advance is open──► LenderPool
                         └──────────────── the rest ────────────► Merchant

Lender ──deposit──► LenderPool ──advance──► Merchant   (offer signed by the underwriter)
```

1. **Get paid.** Customers pay through the merchant's link or QR code. `SplitRouter` sends the USDC and emits a `Payment` event.
2. **Get an offer.** The underwriter reads those events and prices an advance with a public formula. The merchant sees every input.
3. **Draw it.** The merchant submits the signed offer to `LenderPool` and the USDC lands in their wallet.
4. **Repay as you sell.** While the advance is open, 10% of each sale goes to the pool inside the same payment. Slow day, small repayment. No sales, no repayment. There are no debits and no due dates.
5. **Grow.** Each advance repaid in full raises the next offer, up to 2×.

Lenders deposit USDC into the pool, earn the 6% fee as merchants repay, and can withdraw anything that isn't lent out at any time.

### The offer formula

```
eligible   at least 3 different customers in the last 30 days, own payments excluded
volume     each customer counts for at most 20% of the total, so a few large payers can't inflate it
amount     min(volume × 50% × boost, 5,000 USDC, free pool liquidity)
boost      1 + 0.25 per advance repaid in full, up to 2×
fee        6% of the amount, flat
holdback   10% of each sale until repaid
expiry     15 minutes
```

Source: [`underwriter/src/formula.ts`](underwriter/src/formula.ts). The same numbers appear in the app under "How this is worked out".

## What you can do in the app

| Page | For | What it does |
|---|---|---|
| [`/`](https://tillbook.vercel.app) | Everyone | What Tillbook is, with live pool numbers read straight from the contracts |
| [`/merchant`](https://tillbook.vercel.app/merchant) | Merchants | Sales ledger, current offer and the math behind it, draw an advance, amount still owed, payment requests with QR codes, CSV export |
| `/pay/[merchant]` | Customers | Checkout. Shows exactly how the payment splits before you confirm. `?amount=25.50` pre-fills a requested amount |
| [`/lend`](https://tillbook.vercel.app/lend) | Lenders | Pool size, free liquidity, return since launch, deposit and withdraw, every advance with its repayment status |
| `/m/[merchant]` | Lenders and anyone | Public record of a merchant: every sale, repayments, and how their offer is priced |

Every amount links to the transaction or contract read it came from. Nothing in the app is mock data, and empty states say so plainly.

## Why Monad

The repayment happens inside each customer payment, so every sale is a contract call. That only works if paying through the contract feels like paying normally.

- **Fast enough for a checkout.** On Monad a payment that also repays an advance confirms before the customer looks up from their phone. The app shows the measured time on every receipt.
- **Cheap enough for small tickets.** A plain payment costs 67,096 gas and a payment that also repays costs 119,601, so a 5 USDC coffee can carry its own repayment.
- **Native USDC.** Everything settles in Circle's USDC on Monad mainnet, so merchants and lenders hold a real dollar asset, not a wrapped one.
- **Parallel-friendly by design.** Payments to merchants without an open advance only touch the token balances of payer and merchant. The router has no shared counters, so unrelated payments don't contend for the same storage.

## Deployed on Monad mainnet

Source verified on Sourcify.

| Contract | Address |
|---|---|
| LenderPool | [`0x317E89b89aeE6af8c1fD6AaceF06daaD733EFFaE`](https://monadscan.com/address/0x317E89b89aeE6af8c1fD6AaceF06daaD733EFFaE) |
| SplitRouter | [`0x380A8e5A6BbE708E17397f3c31Cb806bfd920853`](https://monadscan.com/address/0x380A8e5A6BbE708E17397f3c31Cb806bfd920853) |
| Underwriter signer | `0x77fB8bc19CB9fc116701b23309287b2d8F577A4A` |
| USDC | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` |

Chain 143. Pool deploy block 112997981. Advance cap 5,000 USDC, fixed at deploy.

| Contract | Role |
|---|---|
| [`LenderPool`](contracts/src/LenderPool.sol) | ERC-4626 USDC vault. Pays advances against EIP-712 offers and takes repayments. Fees reach lenders as repayments arrive. Withdrawals are limited to liquidity that isn't lent out. |
| [`SplitRouter`](contracts/src/SplitRouter.sol) | Splits each payment between the merchant and the pool. Holds no funds and has no owner. |

## Security model

- **No admin keys.** No owner, no pause, no upgrades. Funds move only by the contract rules.
- **The underwriter can only sign offers.** It can't move pool funds. Each offer is bound to one merchant, one pool and one chain, can be used once, and expires in 15 minutes. Only the named merchant can draw it.
- **Hard cap.** No advance can exceed 5,000 USDC, enforced onchain, which bounds the damage from a leaked signing key.
- **One open advance per merchant.** A new one can't be drawn until the last is repaid.
- **Inflation-resistant vault.** The pool uses a 6-decimal share offset against the first-depositor attack.
- **The router checks its own work.** It refuses payments to the pool or router address and verifies the pool's repay result.

## Testing

| Suite | Count |
|---|---|
| Solidity unit, guard and parity tests | 102 |
| Solidity fuzz tests (1,000 runs each) | 20 |
| Solidity invariant tests (256 runs × 64 calls) | 7 |
| Mainnet fork tests against live USDC | 2 |
| TypeScript underwriter tests | 1,202 |

The parity suite proves that offers signed by the TypeScript underwriter produce the same EIP-712 digest in Solidity and are accepted by `requestAdvance`, and that the app's split preview matches the router exactly. Invariants cover pool solvency, share accounting, outstanding principal and withdrawal limits.

CI runs all of it on every push, along with lint, typecheck and a production build of the app.

### Measured on a Monad mainnet fork with live USDC

| Action | Gas |
|---|---|
| Payment, no advance | 67,096 |
| Payment that also repays an advance | 119,601 |
| Draw an advance | 153,643 |
| Lender deposit | 74,005 |

## Repository

```
contracts/     Solidity (Foundry): LenderPool, SplitRouter, tests, deploy script
underwriter/   TypeScript: offer formula, EIP-712 signing, event reader, seed script
web/           Next.js app: landing, merchant, checkout, lender and public record pages
```

## Run it

```bash
# contracts
cd contracts && forge test
MONAD_FORK=true forge test --match-path 'test/fork/*'

# underwriter
cd underwriter && npm install && npm test

# app (reads the mainnet contracts above)
cd web && npm install
cp ../.env.example .env.local   # add UNDERWRITER_PRIVATE_KEY to enable signed offers
npm run dev
```

Deploying your own instance:

```bash
cd contracts
UNDERWRITER_ADDRESS=0x... forge script script/Deploy.s.sol \
  --rpc-url https://rpc.monad.xyz --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

The script refuses to run on any chain except Monad mainnet and checks that the token is 6-decimal USDC.

## Limitations

- A merchant can take payments outside the router after drawing. That can't be blocked onchain, but it shows in their public history and their next offer drops.
- Lenders carry default risk. There's no collateral or collections, and the pool absorbs losses.
- The underwriter is a single signing key. The onchain cap limits what it can do.
- No KYC. A regulated version would need it.
- Someone who deposits right before a large repayment can capture part of its fee. Fees arrive in small slices with each sale, which keeps this small.

## Where this goes next

- **Point-of-sale plugins** so existing card-and-QR checkouts can route USDC through the split without a new app.
- **Multiple underwriters and pools** competing on price for the same public record.
- **Portable credit history** other protocols can read, so a merchant's record works beyond Tillbook.
- **A small protocol fee** on advance fees once the pool has volume.

## Prior art

[Credit Coop](https://www.visa.com/en-us/thought-leadership/innovation/onchain-settlement-financing) uses a similar repayment lockbox to fund card programs such as Rain. Tillbook brings the idea to individual merchants and makes the underwriting inputs public.

## License

MIT
