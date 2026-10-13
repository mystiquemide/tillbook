"use client";

import { useCallback, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { BaseError, ContractFunctionRevertedError, type Hash } from "viem";

export type TxState =
  | { status: "idle" }
  | { status: "signing"; label: string }
  | { status: "pending"; label: string; hash: Hash }
  | { status: "success"; label: string; hash: Hash; ms: number }
  | { status: "error"; label: string; message: string };

/** Sends a contract write, waits for the receipt and measures send-to-receipt time. */
export function useTx() {
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<TxState>({ status: "idle" });

  const run = useCallback(
    async (label: string, submit: () => Promise<Hash>): Promise<boolean> => {
      setState({ status: "signing", label });
      try {
        const hash = await submit();
        const start = performance.now();
        setState({ status: "pending", label, hash });
        const receipt = await client!.waitForTransactionReceipt({ hash, pollingInterval: 200 });
        const ms = Math.round(performance.now() - start);
        if (receipt.status !== "success") {
          setState({ status: "error", label, message: "This transaction didn't go through, so nothing moved. Try again." });
          return false;
        }
        setState({ status: "success", label, hash, ms });
        return true;
      } catch (err) {
        setState({ status: "error", label, message: readable(err) });
        return false;
      }
    },
    [client],
  );

  const send = useCallback(
    (label: string, request: Parameters<typeof writeContractAsync>[0]) => run(label, () => writeContractAsync(request)),
    [run, writeContractAsync],
  );

  return { state, send, run, reset: () => setState({ status: "idle" }) };
}

// Contract errors a user can actually hit, in plain words with a next step.
const reasons: Record<string, string> = {
  OfferExpired: "This offer expired before it was confirmed. Get a fresh offer and try again.",
  BadNonce: "This offer was already used. Get a fresh offer.",
  BadSignature: "This offer couldn't be verified. Get a fresh offer.",
  AdvanceActive: "You already have an advance open. It needs to be repaid before you draw again.",
  InsufficientLiquidity: "The pool doesn't have enough free USDC for this right now. Try a smaller amount or check back later.",
  AboveMaxAdvance: "This is above the 5,000 USDC limit per advance.",
  NotMerchant: "Switch to the wallet this offer was made for.",
  InvalidMerchant: "This isn't a valid merchant address. Ask the merchant for their link again.",
  ZeroAmount: "Enter an amount above zero.",
};

function readable(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof Error && e.name === "UserRejectedRequestError"))
      return "Cancelled in your wallet. Nothing was sent.";
    if (err.walk((e) => e instanceof Error && e.name === "InsufficientFundsError"))
      return "Your wallet needs a little MON to cover the network fee.";
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    const name = revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined;
    if (name && reasons[name]) return reasons[name];
  }
  return "This didn't go through, so nothing moved. Try again, and if it keeps failing, refresh the page.";
}
