import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { links } from "@/lib/links";

export const metadata: Metadata = {
  title: "Risks and privacy | Tillbook",
  description: "What can go wrong for lenders, merchants and customers using Tillbook, and what data Tillbook keeps.",
};

const sections: { title: string; body: ReactNode }[] = [
  {
    title: "Lenders can lose money",
    body: (
      <>
        <p>
          Advances are not backed by collateral. A merchant repays only through sales paid to their Tillbook link. If they
          stop selling, or take payments some other way, the advance may never be repaid, and the pool absorbs the loss.
          That loss is shared by every lender in proportion to their deposit.
        </p>
        <p>
          The limits that reduce this risk are written into the contracts: no advance can exceed 5,000 USDC, a merchant
          can only have one open advance, and offers require sales from at least three different customers.
        </p>
      </>
    ),
  },
  {
    title: "How returns work",
    body: (
      <p>
        Lenders earn the flat 6% fee on each advance, paid into the pool a little at a time as merchants make sales. There
        is no fixed or annual rate. &quot;Realized return since launch&quot; on the lend page is the change in value of one
        pool share since the pool opened, counting only fees that have actually been repaid.
      </p>
    ),
  },
  {
    title: "Withdrawals depend on free liquidity",
    body: (
      <p>
        You can withdraw any time, but only up to the USDC that is not lent out. Money in open advances returns to the pool
        as merchants sell, and becomes withdrawable then.
      </p>
    ),
  },
  {
    title: "Smart contract risk",
    body: (
      <p>
        Tillbook runs on two smart contracts on Monad mainnet. They have no owner, no pause and no upgrade path, so nobody
        can change the rules or move funds outside them. They are covered by 1,336 automated tests, including fuzz,
        invariant and mainnet-fork tests, and their source is verified. They have not had an independent security audit.
        A bug could still cause a loss of funds.
      </p>
    ),
  },
  {
    title: "USDC and network risk",
    body: (
      <p>
        Everything settles in Circle&apos;s USDC on Monad. Tillbook depends on that token and on the Monad network operating
        normally. Transactions also cost a small network fee in MON.
      </p>
    ),
  },
  {
    title: "Merchants",
    body: (
      <p>
        An advance costs a flat 6% fee, shown before you draw it. While it is open, 10% of each sale through your Tillbook
        link goes to repaying it. There are no daily debits, due dates or late fees. Your sales history is public onchain.
      </p>
    ),
  },
  {
    title: "Privacy",
    body: (
      <p>
        Tillbook does not run accounts or store personal data on its own servers. Payments, advances and deposits are
        public onchain, tied to wallet addresses. If you sign in with email or Google, that sign-in is handled by Privy
        under its own privacy policy, and it creates a wallet you control.
      </p>
    ),
  },
  {
    title: "Not financial advice, and no KYC",
    body: (
      <p>
        Tillbook is software, not a bank or a regulated lender. It does not verify identities. Only deposit what you can
        afford to lose.
      </p>
    ),
  },
];

export default function RisksPage() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main id="main" className="px-6 pt-16 pb-24 md:pt-24">
        <div className="mx-auto max-w-[720px]">
          <h1 className="rise text-[44px] leading-[1.08] font-[550] tracking-[-0.05em] md:text-[56px]">Risks and privacy</h1>
          <p className="mt-5 text-[18px] leading-[1.6] text-ink-2">
            What can go wrong when you use Tillbook, in plain words. Read this before you deposit or draw an advance.
          </p>
          <div className="mt-12 space-y-10">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-[22px] font-[500] tracking-[-0.02em]">{s.title}</h2>
                <div className="mt-3 space-y-3 text-[16px] leading-[1.7] text-ink-2">{s.body}</div>
              </section>
            ))}
            <section className="rounded-[20px] border border-hairline bg-surface p-6">
              <h2 className="text-[18px] font-[500]">Security and support</h2>
              <p className="mt-2 text-[15px] leading-[1.6] text-ink-2">
                Found a vulnerability? Report it privately through{" "}
                <a href={`${links.repo}/security`} target="_blank" rel="noreferrer" className="text-primary-ink hover:underline">
                  GitHub security advisories
                </a>
                . For anything else, open an issue on{" "}
                <a href={`${links.repo}/issues`} target="_blank" rel="noreferrer" className="text-primary-ink hover:underline">
                  GitHub
                </a>
                . You can check the contracts yourself on the{" "}
                <Link href="/proof" className="text-primary-ink hover:underline">
                  proof page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
