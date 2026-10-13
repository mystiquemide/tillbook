import { SiteHeader } from "@/components/SiteHeader";

/** Shown while a route's server work finishes. Matches the page layout so nothing jumps. */
export function PageLoading() {
  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" aria-busy="true" className="min-h-[calc(100dvh-65px)] bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6 md:py-14">
        <p role="status" className="py-6 text-[15px] text-ink-2">
          Reading from Monad...
        </p>
        </div>
      </main>
    </>
  );
}
