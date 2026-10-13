# Tillbook

Your sales history is your credit. Take it to any lender.

Merchants take USDC payments on Monad through a split contract. Every sale is public, so any lender can price an advance from it. Once an advance is drawn, a fixed share of each later sale repays it automatically in the same transaction. There are no daily debits and no black-box approval.

Built for Monad Metropolis, Track 01: Onchain Finance & Trading.

## The problem

Merchant financing today is decided by whoever processes the payments, and the merchant can't see why.

- A Shopify merchant who had repaid over £500,000 was refused £180,000 with no reason given. ([r/shopify](https://www.reddit.com/r/shopify/comments/1pyn2ic/shopify_capital_rejected_no_reason_provided_after/))
- A Stripe Capital offer fell from about $35,000 to $6,000 while revenue grew. ([r/stripe](https://www.reddit.com/r/stripe/comments/1p1g2sb/stripe_capital_new_offer_update/))

The merchant's repayment record stays inside one platform. Tillbook puts it onchain where the merchant owns it.

## How it works

```
Customer ──pay()──► SplitRouter ──holdback %──► LenderPool (repays advance)
                         └──────── rest ──────► Merchant

Lender ──deposit──► LenderPool ──advance──► Merchant (offer signed by underwriter)
```

1. Customers pay the merchant through `SplitRouter`. Each payment emits a `Payment` event.
2. The underwriter reads those events and prices an offer with a public formula.
3. The merchant draws the advance from `LenderPool` with the signed offer.
4. While the advance is open, the router sends `holdbackBps` of every sale to the pool.
5. When it is repaid, the merchant's `repaidCount` rises and their next offer grows.

## Offer formula

Computed from the last 30 days of payments through the router.

```
eligible     at least 3 different customers, merchant's own payments excluded
volume       each customer counts for at most 20% of total volume
amount       min(volume × 50% × boost, 5,000 USDC, idle pool liquidity)
boost        1 + 0.25 × repaid advances, up to 2×
fee          6% of amount
holdback     10% of each sale
expiry       15 minutes
```

Source: [`underwriter/src/formula.ts`](underwriter/src/formula.ts).

## Contracts

| Contract | Role |
|---|---|
| [`LenderPool`](contracts/src/LenderPool.sol) | ERC-4626 USDC pool. Pays advances against EIP-712 offers, takes repayments. Fees accrue to lenders as repayments arrive. Lenders can withdraw only liquidity that isn't lent out. |
| [`SplitRouter`](contracts/src/SplitRouter.sol) | Splits each payment between the merchant and the pool. Holds no funds and has no owner. |

Deployed on Monad mainnet (chain 143), source verified on Sourcify:

| | Address |
|---|---|
| LenderPool | [`0x317E89b89aeE6af8c1fD6AaceF06daaD733EFFaE`](https://monadscan.com/address/0x317E89b89aeE6af8c1fD6AaceF06daaD733EFFaE) |
| SplitRouter | [`0x380A8e5A6BbE708E17397f3c31Cb806bfd920853`](https://monadscan.com/address/0x380A8e5A6BbE708E17397f3c31Cb806bfd920853) |
| Underwriter | `0x77fB8bc19CB9fc116701b23309287b2d8F577A4A` |
| USDC | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` |

Pool deploy block: 112997981. Max advance: 5,000 USDC.

### Trust model

- The underwriter key only signs offers. It can't move pool funds.
- Each offer is bound to one merchant, one pool and one chain. Only that merchant can draw it, once, before it expires.
- Each advance is capped onchain at 5,000 USDC, which limits the damage from a leaked underwriter key.
- One active advance per merchant.
- No admin, no pause, no upgrades.

## Measured on a Monad mainnet fork with live USDC

| Action | Gas |
|---|---|
| Payment, no advance | 67,096 |
| Payment that also repays an advance | 119,601 |
| Draw an advance | 153,643 |
| Lender deposit | 74,005 |

## Tests

| Suite | Count |
|---|---|
| Solidity unit, guard and parity tests | 102 |
| Solidity fuzz tests (1,000 runs each by default) | 20 |
| Solidity invariant tests (256 runs × 64 calls) | 7 |
| Mainnet fork tests against live USDC | 2 |
| TypeScript underwriter tests | 1,202 |

The parity suite checks that offers signed by the TypeScript underwriter produce the same EIP-712 digest in Solidity and are accepted by `requestAdvance`, and that split quotes match the router exactly.

```bash
# contracts
cd contracts
forge test
MONAD_FORK=true forge test --match-path 'test/fork/*'

# underwriter
cd underwriter
npm install
npm test
```

## Deploy

```bash
cd contracts
UNDERWRITER_ADDRESS=0x... forge script script/Deploy.s.sol \
  --rpc-url https://rpc.monad.xyz --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

The script refuses to run on any chain other than Monad mainnet, and checks that the token is 6-decimal USDC.

To build payment history and run one full advance cycle, see [`underwriter/scripts/seed.ts`](underwriter/scripts/seed.ts).

## Limitations

- A merchant can take payments outside the router after drawing an advance. That can't be prevented onchain. It does show up in the public history, and their next offer drops.
- Lenders carry default risk. There is no collateral, collections or write-off logic.
- No KYC. A production version needs it.
- The underwriter is a single signing key.
- Someone who deposits just before a large repayment can capture part of its fee. Fees arrive in small slices with each sale, which keeps this small.

## Prior art

[Credit Coop](https://www.visa.com/en-us/thought-leadership/innovation/onchain-settlement-financing) uses a similar repayment lockbox to fund card programs such as Rain. Tillbook applies the idea to individual merchants and makes the underwriting inputs public.

## License

MIT
