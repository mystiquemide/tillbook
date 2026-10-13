import { ImageResponse } from "next/og";

export const alt = "Tillbook: your sales are your credit. Merchant credit on Monad, paid in USDC.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The link preview for Telegram, X, Discord and submission pages. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff", padding: 64, fontFamily: "sans-serif" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 40,
            background: "#f3f1ff",
            padding: "56px 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "#6e54ff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 13px",
                gap: 6,
              }}
            >
              <div style={{ height: 5, borderRadius: 3, background: "#fff", width: 30 }} />
              <div style={{ height: 5, borderRadius: 3, background: "#fff", width: 30 }} />
              <div style={{ height: 5, borderRadius: 3, background: "#fff", width: 18 }} />
            </div>
            <div style={{ fontSize: 40, fontWeight: 600, color: "#211d1d", letterSpacing: -1 }}>Tillbook</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 84, fontWeight: 700, color: "#211d1d", letterSpacing: -4, lineHeight: 1.02 }}>
              Your sales are your credit.
            </div>
            <div style={{ fontSize: 32, color: "#5f5c5c", lineHeight: 1.35, maxWidth: 900 }}>
              Take USDC payments on Monad. Every sale builds a credit record you own. Draw an advance that repays itself from each sale.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {["Live on Monad mainnet", "Paid in USDC", "Verified contracts", "No admin keys"].map((t) => (
              <div
                key={t}
                style={{ display: "flex", alignItems: "center", flexShrink: 0, whiteSpace: "nowrap", height: 52, padding: "0 20px", borderRadius: 999, background: "#ffffff", fontSize: 22, color: "#5a3ff5" }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
