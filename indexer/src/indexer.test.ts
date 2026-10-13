import { describe, it } from "vitest";
import { createTestIndexer, TestHelpers } from "envio";

type Hex = `0x${string}`;
const merchant: Hex = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";
const lender: Hex = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const payers = TestHelpers.Addresses.mockAddresses.slice(0, 3).map((a) => a.toLowerCase() as Hex);
const ref: Hex = `0x${"ab".repeat(32)}`;
const repayTx: Hex = `0x${"cd".repeat(32)}`;

const pay = (payer: Hex, amount: bigint, repaid: bigint) => ({
  contract: "SplitRouter" as const,
  event: "Payment" as const,
  params: { merchant, payer, amount, repaid, ref },
});

describe("Tillbook indexer", () => {
  it("tracks payments, an advance and its repayment end to end", async (t) => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: {
        143: {
          simulate: [
            pay(payers[0]!, 100_000_000n, 0n),
            pay(payers[1]!, 50_000_000n, 0n),
            {
              contract: "LenderPool",
              event: "AdvanceDrawn",
              params: { merchant, amount: 60_000_000n, fee: 3_600_000n, holdbackBps: 1000n, nonce: 0n },
            },
            pay(payers[2]!, 30_000_000n, 3_000_000n),
            { contract: "LenderPool", event: "AdvanceRepaid", params: { merchant, repaidCount: 1n }, transaction: { hash: repayTx } },
          ],
        },
      },
    });

    const m = await indexer.Merchant.getOrThrow(merchant);
    t.expect(m.payments).toBe(3);
    t.expect(m.volume).toBe(180_000_000n);
    t.expect(m.repaidVolume).toBe(3_000_000n);
    t.expect(m.advances).toBe(1);
    t.expect(m.advancesRepaid).toBe(1);
    t.expect(m.openAdvanceId).toBeUndefined();

    const a = await indexer.Advance.getOrThrow(`${merchant}_0`);
    t.expect(a.amount).toBe(60_000_000n);
    t.expect(a.holdbackBps).toBe(1000);
    t.expect(a.repaid).toBe(true);
    t.expect(a.repaidTxHash).toBe(repayTx);

    const totals = await indexer.Totals.getOrThrow("global");
    t.expect(totals.payments).toBe(3);
    t.expect(totals.volume).toBe(180_000_000n);
    t.expect(totals.merchants).toBe(1);
    t.expect(totals.advances).toBe(1);
    t.expect(totals.advanced).toBe(60_000_000n);
    t.expect(totals.advancesRepaid).toBe(1);
  });

  it("keeps an advance open until the repayment event arrives", async (t) => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: {
        143: {
          simulate: [
            {
              contract: "LenderPool",
              event: "AdvanceDrawn",
              params: { merchant, amount: 10_000_000n, fee: 600_000n, holdbackBps: 1000n, nonce: 4n },
            },
          ],
        },
      },
    });
    const a = await indexer.Advance.getOrThrow(`${merchant}_4`);
    t.expect(a.repaid).toBe(false);
    t.expect((await indexer.Merchant.getOrThrow(merchant)).openAdvanceId).toBe(`${merchant}_4`);
  });

  it("nets lender deposits against withdrawals", async (t) => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: {
        143: {
          simulate: [
            { contract: "LenderPool", event: "Deposit", params: { sender: lender, owner: lender, assets: 120_000_000n, shares: 1n } },
            {
              contract: "LenderPool",
              event: "Withdraw",
              params: { sender: lender, receiver: lender, owner: lender, assets: 50_000_000n, shares: 1n },
            },
          ],
        },
      },
    });
    const l = await indexer.Lender.getOrThrow(lender);
    t.expect(l.deposited).toBe(120_000_000n);
    t.expect(l.withdrawn).toBe(50_000_000n);
  });
});
