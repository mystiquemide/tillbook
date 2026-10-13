import { getAddress } from "viem";

/** Signatures that unlock private history stay valid for a day. */
export const VIEW_TTL_SECONDS = 24 * 60 * 60;

/** The exact text a wallet signs to prove it owns an address. Shared by the app and the server. */
export function viewMessage(address: string, expires: number): string {
  return [
    "Tillbook: show my private activity",
    `Address: ${getAddress(address)}`,
    `Valid until: ${new Date(expires * 1000).toISOString()}`,
    "",
    "This only proves you own this wallet. It doesn't move funds or cost a fee.",
  ].join("\n");
}

export const VIEW_HEADERS = { expires: "x-tillbook-expires", signature: "x-tillbook-signature" } as const;
