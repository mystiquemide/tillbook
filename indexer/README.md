# Tillbook indexer

Envio HyperIndex indexer for the Tillbook contracts on Monad mainnet (chain 143). It reads through HyperSync, so no RPC key is needed.

| Entity | Built from |
|---|---|
| `Payment` | `SplitRouter.Payment` |
| `Advance` | `LenderPool.AdvanceDrawn`, closed by `AdvanceRepaid` |
| `Merchant` | Running totals per merchant |
| `Lender` | `LenderPool.Deposit` and `Withdraw` |
| `Totals` | Network-wide totals, id `global` |

```bash
pnpm install
pnpm codegen
pnpm test      # handler tests, no database needed
pnpm dev       # local indexer with GraphQL (needs Docker)
```

The web app reads from this indexer when `ENVIO_GRAPHQL_URL` is set and the indexer is within about 10 seconds of the chain head. Otherwise it falls back to reading logs from the chain.
