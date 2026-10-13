import { Reveal } from "../motion/Reveal";

type Piece = { logo: string; name: string; role: string; href: string };

const stack: Piece[] = [
  {
    logo: "/brands/monad.svg",
    name: "Monad",
    role: "Mainnet, chain 143. Fast, cheap blocks are what make a repayment inside every single sale practical.",
    href: "https://monad.xyz",
  },
  {
    logo: "/brands/usdc.svg",
    name: "USDC",
    role: "Circle's native USDC on Monad. Every payment, advance and repayment settles in it.",
    href: "https://www.circle.com/usdc",
  },
  {
    logo: "/brands/openzeppelin.svg",
    name: "OpenZeppelin",
    role: "The pool is an ERC-4626 vault with EIP-712 offers, SafeERC20 transfers and reentrancy guards.",
    href: "https://www.openzeppelin.com/contracts",
  },
  {
    logo: "/brands/privy.png",
    name: "Privy",
    role: "Sign in with email or Google and get a Monad wallet on the spot. No extension, no seed phrase.",
    href: "https://www.privy.io",
  },
  {
    logo: "/brands/envio.png",
    name: "Envio",
    role: "A HyperIndex indexer tracks every payment, advance and repayment, so ledgers and offers load instantly.",
    href: "https://envio.dev",
  },
  {
    logo: "/brands/alchemy.svg",
    name: "Alchemy",
    role: "Contract reads and offer pricing run through Alchemy's Monad RPC, with the public RPC as backup.",
    href: "https://www.alchemy.com",
  },
];

const tools: { logo: string; name: string; href: string }[] = [
  { logo: "/brands/solidity.svg", name: "Solidity", href: "https://soliditylang.org" },
  { logo: "/brands/foundry.png", name: "Foundry", href: "https://getfoundry.sh" },
  { logo: "/brands/viem.png", name: "viem", href: "https://viem.sh" },
  { logo: "/brands/wagmi.svg", name: "wagmi", href: "https://wagmi.sh" },
  { logo: "/brands/sourcify.svg", name: "Sourcify", href: "https://sourcify.dev" },
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
            No private ledger and no custom token. Tillbook runs on public chain infrastructure and tools that real teams ship with.
          </p>
        </Reveal>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-[20px] border border-hairline bg-hairline md:grid-cols-3">
          {stack.map(({ logo, name, role, href }, i) => (
            <Reveal as="li" key={name} delay={(i % 3) * 90} className="bg-white">
              <a href={href} target="_blank" rel="noreferrer" className="group flex h-full flex-col p-7 transition-colors hover:bg-surface">
                <span className="flex items-center">
                  <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-surface ring-1 ring-hairline transition-transform duration-300 group-hover:scale-110">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="" width={26} height={26} className="h-[26px] w-[26px]" />
                  </span>
                </span>
                <span className="mt-6 text-[19px] font-[450] tracking-[-0.01em]">{name}</span>
                <span className="mt-2 text-[14px] leading-[1.6] text-ink-2">{role}</span>
              </a>
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-8">
          <p className="text-center text-[13px] text-ink-3">Written, tested and verified with</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-3">
            {tools.map(({ logo, name, href }) => (
              <li key={name}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2.5 rounded-full bg-white px-4 text-[15px] text-ink ring-1 ring-hairline transition-colors hover:bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" width={20} height={20} className="h-5 w-5 rounded-[4px] object-contain" />
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
