import { SiteHeader } from "@/components/SiteHeader";

/** Shown while a route's server work finishes. Matches the page layout so nothing jumps. */
export function PageLoading() {
  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" aria-busy="true" className="mx-auto max-w-[1200px] px-4 py-12 md:px-6">
        <p role="status" className="py-6 text-[15px] text-ink-2">
          Reading from Monad...
        </p>
      </main>
    </>
  );
}
