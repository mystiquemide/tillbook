"use client";

// Last resort when the root layout itself fails. It can't rely on the layout's fonts or styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#211d1d" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-0.03em", margin: 0 }}>Something broke on our side.</h1>
          <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.6, color: "#636161" }}>
            Your funds are safe. Nothing moves without a transaction you confirm in your wallet.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 32, height: 48, padding: "0 24px", border: 0, borderRadius: 999, background: "#6e54ff", color: "#fff", fontSize: 16, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
