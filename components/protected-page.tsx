import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { configured } from "@/lib/config"
import { AuthGate } from "./auth-gate"
/** Resource-level auth; every protected page opts in directly. */
export async function ProtectedPage({
  children,
  admin,
}: {
  children: React.ReactNode
  admin?: boolean
}) {
  if (configured && !(await isAuthenticatedNextjs())) {
    const destination = (await headers()).get("x-auth-return-to")
    const query = destination
      ? new URLSearchParams({ next: destination })
      : null
    redirect(query ? `/sign-in?${query}` : "/sign-in")
  }
  return <AuthGate admin={admin}>{children}</AuthGate>
}
