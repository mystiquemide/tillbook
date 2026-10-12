import { formatUnits, parseUnits } from "viem";

/** USDC has 6 decimals. Shows 2 decimals, never rounds a non-zero value down to 0.00. */
export function usdc(value: bigint): string {
  if (value > 0n && value < 10_000n) return "<0.01";
  const n = Number(formatUnits(value, 6));
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Parses a user-typed USDC amount. Returns null when it isn't a valid positive amount. */
export function parseUsdc(input: string): bigint | null {
  const s = input.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(s)) return null;
  const v = parseUnits(s, 6);
  return v > 0n ? v : null;
}

export const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export function date(ts: bigint | string | number): string {
  return new Date(Number(ts) * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
