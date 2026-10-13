import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** A quiet way back to the landing page from any inner page. */
export function BackHome({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-1.5 text-[14px] text-ink-2 transition-colors hover:text-ink ${className}`}
    >
      <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
      Back to home
    </Link>
  );
}
