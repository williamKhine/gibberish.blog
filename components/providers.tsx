"use client"
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs"
import { ConvexReactClient } from "convex/react"
import { ThemeProvider } from "./theme-provider"
import { configured } from "@/lib/config"
const client = configured
  ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  : null
export function Providers({ children }: { children: React.ReactNode }) {
  const theme = <ThemeProvider>{children}</ThemeProvider>
  return client ? (
    <ConvexAuthNextjsProvider client={client}>{theme}</ConvexAuthNextjsProvider>
  ) : (
    theme
  )
}
