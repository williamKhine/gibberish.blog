"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { configured } from "@/lib/config"
export function PreviewGate() {
  return (
    <div className="page-width narrow inner-page">
      <span className="eyebrow">YOUR LITTLE CORNER</span>
      <h1>Almost home.</h1>
      <p className="intro">
        You’re exploring a sample-data preview. Connect the community to sign
        in, save your words, and meet your people.
      </p>
      <Link className="button primary" href="/setup">
        Set up Gibberish ↗
      </Link>
      <div className="panel">
        <h2>Good things take a little care.</h2>
        <p>
          Anyone can join to follow writers, save posts, and react. A short
          application unlocks writing, comments, and your own scrapbook profile.
        </p>
        <Link href="/rules" className="subtle-link">
          Read the house rules
        </Link>
      </div>
    </div>
  )
}
function ConnectedGate({
  children,
  admin = false,
}: {
  children: React.ReactNode
  admin?: boolean
}) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensure = useMutation(api.community.ensureMember)
  const user = useQuery(api.community.me, isAuthenticated ? {} : "skip")
  const [error, setError] = useState("")
  useEffect(() => {
    if (isAuthenticated && user === null)
      ensure().catch((e) => setError(e.message))
  }, [isAuthenticated, user, ensure])
  if (error)
    return (
      <div className="page-width inner-page">
        <p className="error" role="alert">
          {error}
        </p>
        <Link href="/sign-in">Check your account</Link>
      </div>
    )
  if (isLoading || (isAuthenticated && !user))
    return (
      <p className="empty-state" role="status">
        Making you at home…
      </p>
    )
  if (!isAuthenticated)
    return (
      <div className="empty-state">
        <Link className="button primary" href="/sign-in">
          Sign in to find your corner
        </Link>
      </div>
    )
  if (user?.suspended)
    return (
      <div className="empty-state">
        This account is suspended. Publishing and community interactions are
        unavailable.
      </div>
    )
  if (admin && !user?.isAdmin)
    return (
      <div className="empty-state">
        This corner is for community administrators.
      </div>
    )
  return children
}
export function AuthGate({
  children,
  admin,
}: {
  children: React.ReactNode
  admin?: boolean
}) {
  return configured ? (
    <ConnectedGate admin={admin}>{children}</ConnectedGate>
  ) : (
    <PreviewGate />
  )
}
