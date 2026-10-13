import { CircleGauge, FlaskConical, KeyRound, Landmark, ShieldCheck, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { ButtonLink } from "../Button";
import { links } from "@/lib/links";

const src = (path: string) => `${links.repo}/blob/main/${path}`;

type Fact = { icon: ComponentType<{ size?: number; strokeWidth?: number }>; value: string; label: string; href: string };

const facts: Fact[] = [
  {
    icon: KeyRound,
    value: "No admin keys",
    label: "No owner, no pause, no upgrades. Lender funds can only move by the contract rules.",
    href: src("contracts/src/LenderPool.sol"),
  },
  {
    icon: ShieldCheck,
    value: "5,000 USDC cap",
    label: "Hard limit per advance, set in the contract at deploy. A leaked signing key can't go past it.",
    href: src("contracts/script/Deploy.s.sol"),
  },
  {
    icon: Landmark,
    value: "Fees paid as sales repay",
    label: "Lenders earn each advance fee slice by slice as merchants repay it, not all at once when the advance is drawn.",
    href: src("contracts/src/LenderPool.sol"),
  },
  {
    icon: FlaskConical,
    value: "1,333 tests",
    label: "131 contract tests including fuzz and invariant runs, plus 1,202 underwriter tests.",
    href: src("contracts/test"),
  },
  {
    icon: CircleGauge,
    value: "Tested on live USDC",
    label: "The full loop runs against the real USDC contract on a fork of Monad mainnet.",
    href: src("contracts/test/fork/MainnetFork.t.sol"),
  },
  {
    icon: Zap,
    value: "119,601 gas",
    label: "Measured cost of a payment that also repays an advance, on that mainnet fork.",
    href: `${links.repo}#measured-on-a-monad-mainnet-fork-with-live-usdc`,
  },
];

export function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="scroll-mt-20 px-3 pt-6 md:px-6">
      <div className="mx-auto max-w-[1392px] rounded-[32px] bg-[#f3f1ff] px-6 py-16 md:py-24">
        <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
          <h2 id="trust-title" className="text-[40px] leading-[1.08] font-[550] tracking-[-0.05em] md:text-[72px] md:leading-[1.1]">
            Trusted by default
          </h2>
          <p className="mt-5 max-w-[560px] text-[17px] leading-[1.55] text-ink-2 md:text-[19px]">
            Open source, onchain and capped. Every claim below links to the code or test that proves it.
          </p>
          <div className="mt-8">
            <ButtonLink href={links.repo} target="_blank" rel="noreferrer" variant="tint">
              Read the code
            </ButtonLink>
          </div>
        </div>
        <ul className="mx-auto mt-14 grid max-w-[960px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(({ icon: Icon, value, label, href }) => (
            <li key={value}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex h-full flex-col rounded-[16px] border border-hairline bg-white p-6 transition-colors hover:border-[#d6d0ff]"
              >
                <span className="text-primary">
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <span className="mt-5 text-[22px] font-[450] tracking-[-0.02em]">{value}</span>
                <span className="mt-2 text-[14px] leading-[1.55] text-ink-2">{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
