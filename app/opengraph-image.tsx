import { ImageResponse } from "next/og"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: 85,
        background: "#f6f3e9",
        color: "#252c24",
      }}
    >
      <div style={{ fontSize: 30, marginBottom: 35 }}>✳ gibberish.</div>
      <div style={{ fontSize: 75, fontWeight: 700, letterSpacing: -3 }}>
        Big thoughts. Small thoughts.
      </div>
      <div
        style={{
          fontSize: 75,
          fontWeight: 700,
          background: "#f1d252",
          marginTop: 8,
        }}
      >
        Absolutely gibberish.
      </div>
      <div style={{ fontSize: 24, marginTop: 40 }}>
        A little less polished. A little more you.
      </div>
    </div>,
    size
  )
}
