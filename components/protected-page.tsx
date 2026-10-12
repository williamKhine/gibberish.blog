import { auth } from "@clerk/nextjs/server"
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
  if (configured) await auth.protect()
  return <AuthGate admin={admin}>{children}</AuthGate>
}
