import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

export const poolAbi = parseAbi([
  "struct Offer { address merchant; uint256 amount; uint256 fee; uint16 holdbackBps; uint256 nonce; uint256 expiry; }",
  "struct Advance { uint128 owed; uint128 principal; uint16 holdbackBps; bool active; }",
  "function requestAdvance(Offer offer, bytes signature)",
  "function advanceOf(address merchant) view returns (Advance)",
  "function repaidCount(address merchant) view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function idle() view returns (uint256)",
  "function principalOutstanding() view returns (uint256)",
  "function maxAdvance() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function maxWithdraw(address owner) view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
  "event AdvanceDrawn(address indexed merchant, uint256 amount, uint256 fee, uint16 holdbackBps, uint256 nonce)",
  "event AdvanceRepaid(address indexed merchant, uint256 repaidCount)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
]);

export const routerAbi = parseAbi([
  "event Payment(address indexed merchant, address indexed payer, uint256 amount, uint256 repaid, bytes32 ref)",
  "function pay(address merchant, uint256 amount, bytes32 ref)",
  "function quote(address merchant, uint256 amount) view returns (uint256 toPool, uint256 toMerchant)",
]);
