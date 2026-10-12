"use client";

import { useCallback, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { BaseError, type Hash } from "viem";

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

  const send = useCallback(
    async (label: string, request: Parameters<typeof writeContractAsync>[0]): Promise<boolean> => {
      setState({ status: "signing", label });
      try {
        const hash = await writeContractAsync(request);
        const start = performance.now();
        setState({ status: "pending", label, hash });
        const receipt = await client!.waitForTransactionReceipt({ hash, pollingInterval: 200 });
        const ms = Math.round(performance.now() - start);
        if (receipt.status !== "success") {
          setState({ status: "error", label, message: "The transaction reverted onchain." });
          return false;
        }
        setState({ status: "success", label, hash, ms });
        return true;
      } catch (err) {
        setState({ status: "error", label, message: readable(err) });
        return false;
      }
    },
    [client, writeContractAsync],
  );

  return { state, send, reset: () => setState({ status: "idle" }) };
}

function readable(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof Error && e.name === "UserRejectedRequestError")) return "You rejected the request in your wallet.";
    return err.shortMessage;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}
