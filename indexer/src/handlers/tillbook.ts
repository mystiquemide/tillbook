import { indexer } from "envio";
import type { Merchant, Totals } from "envio";

const GLOBAL = "global";

const emptyTotals = (): Totals => ({
  id: GLOBAL,
  payments: 0,
  volume: 0n,
  merchants: 0,
  advances: 0,
  advanced: 0n,
  advancesRepaid: 0,
  lastBlock: 0n,
});

const emptyMerchant = (id: string): Merchant => ({
  id,
  payments: 0,
  volume: 0n,
  repaidVolume: 0n,
  advances: 0,
  advancesRepaid: 0,
  openAdvanceId: undefined,
});

const eventId = (e: { chainId: number; block: { number: number }; logIndex: number }) =>
  `${e.chainId}_${e.block.number}_${e.logIndex}`;

indexer.onEvent({ contract: "SplitRouter", event: "Payment" }, async ({ event, context }) => {
  const { merchant, payer, amount, repaid, ref } = event.params;
  context.Payment.set({
    id: eventId(event),
    merchant,
    payer,
    amount,
    repaid,
    ref,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });

  const existing = await context.Merchant.get(merchant);
  const m = existing ?? emptyMerchant(merchant);
  context.Merchant.set({ ...m, payments: m.payments + 1, volume: m.volume + amount, repaidVolume: m.repaidVolume + repaid });

  const t = (await context.Totals.get(GLOBAL)) ?? emptyTotals();
  context.Totals.set({
    ...t,
    payments: t.payments + 1,
    volume: t.volume + amount,
    merchants: existing ? t.merchants : t.merchants + 1,
    lastBlock: BigInt(event.block.number),
  });
});

indexer.onEvent({ contract: "LenderPool", event: "AdvanceDrawn" }, async ({ event, context }) => {
  const { merchant, amount, fee, holdbackBps, nonce } = event.params;
  const id = `${merchant}_${nonce}`;
  context.Advance.set({
    id,
    merchant,
    amount,
    fee,
    holdbackBps: Number(holdbackBps),
    nonce,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
    repaid: false,
    repaidTxHash: undefined,
  });

  const m = (await context.Merchant.get(merchant)) ?? emptyMerchant(merchant);
  context.Merchant.set({ ...m, advances: m.advances + 1, openAdvanceId: id });

  const t = (await context.Totals.get(GLOBAL)) ?? emptyTotals();
  context.Totals.set({ ...t, advances: t.advances + 1, advanced: t.advanced + amount, lastBlock: BigInt(event.block.number) });
});

indexer.onEvent({ contract: "LenderPool", event: "AdvanceRepaid" }, async ({ event, context }) => {
  const { merchant } = event.params;
  const m = (await context.Merchant.get(merchant)) ?? emptyMerchant(merchant);
  // A merchant has at most one open advance, so the repayment always closes it.
  if (m.openAdvanceId) {
    const a = await context.Advance.get(m.openAdvanceId);
    if (a) context.Advance.set({ ...a, repaid: true, repaidTxHash: event.transaction.hash });
  }
  context.Merchant.set({ ...m, advancesRepaid: m.advancesRepaid + 1, openAdvanceId: undefined });

  const t = (await context.Totals.get(GLOBAL)) ?? emptyTotals();
  context.Totals.set({ ...t, advancesRepaid: t.advancesRepaid + 1, lastBlock: BigInt(event.block.number) });
});

indexer.onEvent({ contract: "LenderPool", event: "Deposit" }, async ({ event, context }) => {
  const { owner, assets } = event.params;
  const l = (await context.Lender.get(owner)) ?? { id: owner, deposited: 0n, withdrawn: 0n };
  context.Lender.set({ ...l, deposited: l.deposited + assets });
});

indexer.onEvent({ contract: "LenderPool", event: "Withdraw" }, async ({ event, context }) => {
  const { owner, assets } = event.params;
  const l = (await context.Lender.get(owner)) ?? { id: owner, deposited: 0n, withdrawn: 0n };
  context.Lender.set({ ...l, withdrawn: l.withdrawn + assets });
});
