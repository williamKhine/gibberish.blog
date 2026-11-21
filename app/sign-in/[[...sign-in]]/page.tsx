import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server"
import { redirect } from "next/navigation"
import { configured } from "@/lib/config"
import { PreviewGate } from "@/components/auth-gate"
import { GoogleSignIn } from "@/components/google-sign-in"

function destination(next: string | string[] | undefined) {
  if (typeof next !== "string" || !next.startsWith("/")) return "/dashboard"

  const origin = "https://gibberish.invalid"
  const url = URL.parse(next, origin)
  if (
    !url ||
    url.origin !== origin ||
    url.pathname.startsWith("//") ||
    /^\/sign-(in|up)(\/|$)/.test(url.pathname)
  )
    return "/dashboard"

  return url.pathname + url.search
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[]
    returned?: string | string[]
  }>
}) {
  if (!configured) return <PreviewGate />

  const { next, returned } = await searchParams
  const target = destination(next)
  if (await isAuthenticatedNextjs()) redirect(target)

  const callback = new URLSearchParams({ next: target, returned: "1" })
  return (
    <div className="page-width narrow inner-page">
      <h1>Log in to Gibberish.</h1>
      <p className="intro">Use your Google account to join or log in.</p>
      {returned === "1" && (
        <p role="alert" className="error">
          Google sign-in didn’t complete. Please try again with a verified
          email.
        </p>
      )}
      <GoogleSignIn redirectTo={`/sign-in?${callback}`} />
    </div>
  )
}
