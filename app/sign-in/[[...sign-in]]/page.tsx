import Link from "next/link"
import { PasswordSignIn } from "@/components/password-sign-in"
import { authDestination } from "@/lib/auth-destination"
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server"
import { redirect } from "next/navigation"
import { configured } from "@/lib/config"
import { PreviewGate } from "@/components/auth-gate"
import { GoogleSignIn } from "@/components/google-sign-in"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[]
    returned?: string | string[]
    recover?: string | string[]
  }>
}) {
  if (!configured) return <PreviewGate />

  const { next, returned, recover } = await searchParams
  const target = authDestination(next)
  if (recover !== "finish" && (await isAuthenticatedNextjs())) redirect(target)

  if (recover === "1" || recover === "finish") {
    const mode = recover === "finish" ? "reset-verification" : "reset"
    return (
      <div className="page-width narrow inner-page">
        <h1>Reset your password.</h1>
        <PasswordSignIn key={mode} mode={mode} target={target} />
        <Link href={{ pathname: "/sign-in", query: { next: target } }}>
          Back to sign in
        </Link>
      </div>
    )
  }

  const callback = new URLSearchParams({ next: target, returned: "1" })
  return (
    <div className="page-width narrow inner-page">
      <h1>Log in to Gibberish.</h1>

      {returned === "1" && (
        <p role="alert" className="error">
          Google sign-in didn’t complete. Please try again with a verified
          email.
        </p>
      )}
      <PasswordSignIn key="signIn" mode="signIn" target={target} />
      <div className="row">
        <GoogleSignIn redirectTo={`/sign-in?${callback}`} />
        <Link
          href={{ pathname: "/sign-in", query: { next: target, recover: "1" } }}
        >
          Forgot password?
        </Link>
        <Link href={{ pathname: "/sign-up", query: { next: target } }}>
          Create an account
        </Link>
      </div>
    </div>
  )
}
