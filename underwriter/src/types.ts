export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export type Payment = {
  merchant: Address;
  payer: Address;
  amount: bigint;
  repaid: bigint;
  timestamp: bigint;
  blockNumber: bigint;
  txHash: Hex;
  ref: Hex;
};
