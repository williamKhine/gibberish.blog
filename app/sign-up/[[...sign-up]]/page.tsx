import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { PreviewGate } from "@/components/auth-gate"
import { PasswordSignIn } from "@/components/password-sign-in"
import { authDestination } from "@/lib/auth-destination"
import { configured } from "@/lib/config"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  if (!configured) return <PreviewGate />

  const target = authDestination((await searchParams).next)
  if (await isAuthenticatedNextjs()) redirect(target)

  return (
    <div className="page-width narrow inner-page">
      <h1>Join Gibberish.</h1>
      <PasswordSignIn mode="signUp" target={target} />
      <div className="row">
        <Link href={{ pathname: "/sign-in", query: { next: target } }}>
          Already a member? Sign in
        </Link>
      </div>
    </div>
  )
}
