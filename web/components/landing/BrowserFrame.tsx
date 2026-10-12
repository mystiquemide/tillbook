import Image from "next/image";

/** A real product screenshot inside a simple browser window. */
export function BrowserFrame({ src, alt, path, dark = false }: { src: string; alt: string; path: string; dark?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-[14px] ring-1 ${dark ? "bg-[#211d22] ring-white/10" : "bg-white ring-black/10"}`}
    >
      <div className={`flex h-9 items-center gap-2 px-4 ${dark ? "bg-[#2a252b]" : "bg-[#f4f3f1]"}`}>
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span
          className={`mx-auto rounded-md px-3 py-0.5 font-mono text-[11px] ${dark ? "bg-white/5 text-white/50" : "bg-white text-ink-3"}`}
        >
          tillbook / {path}
        </span>
        <span className="w-[46px]" />
      </div>
      <Image src={src} alt={alt} width={2560} height={1600} sizes="(max-width: 1100px) 100vw, 1040px" className="h-auto w-full" />
    </div>
  );
}
