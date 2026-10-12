export type ApiPayment = {
  payer: string;
  amount: string;
  repaid: string;
  timestamp: string;
  txHash: string;
};

export type ApiInputs = {
  volume: string;
  cappedVolume: string;
  distinctPayers: number;
  repaidCount: string;
  boostBps: string;
  poolIdle: string;
};

export type ApiOffer = {
  merchant: `0x${string}`;
  amount: string;
  fee: string;
  holdbackBps: number;
  nonce: string;
  expiry: string;
};

export type MerchantResponse =
  | { eligible: true; offer: ApiOffer; signature: `0x${string}`; inputs: ApiInputs; payments: ApiPayment[] }
  | {
      eligible: false;
      reason: "too_few_payers" | "no_volume" | "pool_empty" | "advance_active";
      inputs: ApiInputs | null;
      payments: ApiPayment[];
    };

export class ApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export async function fetchMerchant(address: string): Promise<MerchantResponse> {
  const res = await fetch(`/api/merchant/${address}`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) throw new ApiError(body.error ?? "unknown");
  return body;
}
