import type { Metadata } from "next"
import "@fontsource-variable/roboto-slab"
import "@fontsource-variable/oxanium"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Shell } from "@/components/shell"
import { configured, siteUrl } from "@/lib/config"
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gibberish — a little corner of the internet",
    template: "%s · Gibberish",
  },
  description:
    "Big feelings. Small observations. Questionable punctuation. A home for your perfectly unnecessary words.",
  robots: configured
    ? { index: true, follow: true }
    : { index: false, follow: false },
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  )
}
