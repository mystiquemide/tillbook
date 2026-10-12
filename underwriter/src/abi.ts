import { parseAbi, parseAbiItem } from "viem";

export const paymentEvent = parseAbiItem(
  "event Payment(address indexed merchant, address indexed payer, uint256 amount, uint256 repaid, bytes32 ref)",
);

export const poolAbi = parseAbi([
  "function nonces(address) view returns (uint256)",
  "function repaidCount(address) view returns (uint256)",
  "function idle() view returns (uint256)",
  "function holdbackOf(address) view returns (uint256 owed, uint16 holdbackBps)",
  "function underwriter() view returns (address)",
  "function requestAdvance((address merchant,uint256 amount,uint256 fee,uint16 holdbackBps,uint256 nonce,uint256 expiry) offer, bytes signature)",
]);
