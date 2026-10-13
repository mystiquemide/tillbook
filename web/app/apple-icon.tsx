import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS: the Tillbook mark on brand purple. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#6e54ff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 42px",
          gap: 16,
        }}
      >
        <div style={{ height: 16, borderRadius: 8, background: "#fff", width: 96 }} />
        <div style={{ height: 16, borderRadius: 8, background: "#fff", width: 96 }} />
        <div style={{ height: 16, borderRadius: 8, background: "#fff", width: 58 }} />
      </div>
    ),
    size,
  );
}
