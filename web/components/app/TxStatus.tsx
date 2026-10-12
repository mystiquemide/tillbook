import type { TxState } from "@/lib/useTx";
import { txUrl } from "@/lib/chain";

export function TxStatus({ state }: { state: TxState }) {
  if (state.status === "idle") return null;
  if (state.status === "signing") return <p className="text-[14px] text-ink-2">Confirm in your wallet to {state.label.toLowerCase()}.</p>;
  if (state.status === "pending")
    return (
      <p className="text-[14px] text-ink-2">
        Settling on Monad...{" "}
        <a href={txUrl(state.hash)} target="_blank" rel="noreferrer" className="font-mono text-primary-ink underline-offset-2 hover:underline">
          view
        </a>
      </p>
    );
  if (state.status === "success")
    return (
      <p className="text-[14px] text-positive">
        {state.label} settled in {state.ms < 100 ? "under 0.1s" : `${(state.ms / 1000).toFixed(1)}s`}.{" "}
        <a href={txUrl(state.hash)} target="_blank" rel="noreferrer" className="font-mono underline-offset-2 hover:underline">
          view transaction
        </a>
      </p>
    );
  return <p className="text-[14px] text-error">{state.message}</p>;
}
