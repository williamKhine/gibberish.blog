"use client"
import { ClerkProvider, useAuth } from "@clerk/nextjs"
import { ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ThemeProvider } from "./theme-provider"
import { configured } from "@/lib/config"
const client = configured
  ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  : null
export function Providers({ children }: { children: React.ReactNode }) {
  const theme = <ThemeProvider>{children}</ThemeProvider>
  return client ? (
    <ClerkProvider>
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        {theme}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  ) : (
    theme
  )
}
