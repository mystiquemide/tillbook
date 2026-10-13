import { ArrowUpRight, BadgeCheck, Blocks, CircleDollarSign, FlaskConical, PlugZap, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";
import { Reveal } from "../motion/Reveal";

type Piece = { icon: ComponentType<{ size?: number; strokeWidth?: number }>; name: string; role: string; href: string };

const stack: Piece[] = [
  {
    icon: Blocks,
    name: "Monad",
    role: "Mainnet, chain 143. Fast, cheap blocks are what make a repayment inside every single sale practical.",
    href: "https://monad.xyz",
  },
  {
    icon: CircleDollarSign,
    name: "USDC",
    role: "Circle's native USDC on Monad. Every payment, advance and repayment settles in it.",
    href: "https://www.circle.com/usdc",
  },
  {
    icon: ShieldCheck,
    name: "OpenZeppelin",
    role: "The pool is an ERC-4626 vault with EIP-712 offers, SafeERC20 transfers and reentrancy guards.",
    href: "https://www.openzeppelin.com/contracts",
  },
  {
    icon: FlaskConical,
    name: "Foundry",
    role: "Unit, fuzz and invariant tests, plus fork tests that run the full loop against live USDC.",
    href: "https://getfoundry.sh",
  },
  {
    icon: PlugZap,
    name: "viem and wagmi",
    role: "Typed contract reads, wallet connection and the underwriter's EIP-712 signing.",
    href: "https://viem.sh",
  },
  {
    icon: BadgeCheck,
    name: "Sourcify",
    role: "Both contracts are source-verified, so anyone can match the code to what runs onchain.",
    href: "https://sourcify.dev",
  },
];

export function BuiltOn() {
  return (
    <section aria-labelledby="built-title" className="px-6 pt-20 md:pt-28">
      <div className="mx-auto max-w-[1100px]">
        <Reveal className="mx-auto max-w-[620px] text-center">
          <p className="text-[14px] font-[450] tracking-[0.08em] text-primary-ink uppercase">Built on</p>
          <h2 id="built-title" className="mt-3 text-[34px] leading-[1.1] font-[550] tracking-[-0.04em] md:text-[48px]">
            Open rails, end to end
          </h2>
          <p className="mt-4 text-[17px] leading-[1.55] text-ink-2">
            No private ledger and no custom token. Tillbook is built from public pieces anyone can inspect.
          </p>
        </Reveal>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-[20px] border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {stack.map(({ icon: Icon, name, role, href }, i) => (
            <Reveal as="li" key={name} delay={(i % 3) * 90} className="bg-white">
              <a href={href} target="_blank" rel="noreferrer" className="group flex h-full flex-col p-7 transition-colors hover:bg-surface">
                <span className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-primary-tint text-primary-ink transition-transform duration-300 group-hover:scale-110">
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <ArrowUpRight
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="text-ink-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink"
                  />
                </span>
                <span className="mt-6 text-[19px] font-[450] tracking-[-0.01em]">{name}</span>
                <span className="mt-2 text-[14px] leading-[1.6] text-ink-2">{role}</span>
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
