"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useTheme } from "next-themes"
import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth } from "convex/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  PencilEdit01Icon,
  Sun03Icon,
  Moon02Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons"
import { hasAuthCookie } from "@/lib/auth-session"
import { configured } from "@/lib/config"
import { Button } from "./ui/button"
function Account() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function logOut() {
    setPending(true)
    setError("")
    try {
      await signOut()
      if (await hasAuthCookie()) throw new Error("Session cookie remains.")
      router.replace("/")
      router.refresh()
    } catch {
      setError("Couldn’t sign out. Please try again.")
    } finally {
      setPending(false)
    }
  }

  if (isLoading) return null
  return isAuthenticated || error ? (
    <>
      <Button variant="ghost" disabled={pending} onClick={logOut}>
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error && <span role="alert">{error}</span>}
    </>
  ) : (
    <Link href="/sign-in" className="login-link">
      Log in
    </Link>
  )
}
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="wordmark" aria-label="Gibberish home">
            <span className="logo-star">✳</span> gibberish
            <span className="logo-dot">.</span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link className={path === "/" ? "active" : ""} href="/">
              The good stuff
            </Link>
            <Link
              className={path === "/following" ? "active" : ""}
              href="/following"
            >
              Following
            </Link>
            <Link href="/bookmarks">Bookmarks</Link>
          </nav>
          <div className="header-actions">
            <Link href="/search" aria-label="Search" className="icon-button">
              <HugeiconsIcon icon={Search01Icon} size={19} />
            </Link>
            <button
              aria-label="Toggle color theme"
              className="icon-button"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <HugeiconsIcon
                icon={Sun03Icon}
                size={19}
                className="dark:hidden"
              />
              <HugeiconsIcon
                icon={Moon02Icon}
                size={19}
                className="hidden dark:block"
              />
            </button>
            {configured ? (
              <Account />
            ) : (
              <Link href="/setup" className="login-link">
                Log in
              </Link>
            )}
            <Link href="/dashboard" className="button primary">
              <HugeiconsIcon icon={PencilEdit01Icon} size={17} /> Write a little
            </Link>
          </div>
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <Link href="/">The good stuff</Link>
          <Link href="/following">Following</Link>
          <Link href="/bookmarks">Bookmarks</Link>
          <Link href="/dashboard">Your corner</Link>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <Link className="wordmark small" href="/">
          ✳ gibberish.
        </Link>
        <span>A little less polished. A little more you.</span>
        <div>
          <Link href="/rules">House rules</Link>
          <a href="/rss.xml">RSS ↗</a>
          <Link href="/dashboard">
            Your corner <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
          </Link>
        </div>
      </footer>
      {!configured && (
        <div className="preview-label">
          <span className="live-dot" /> Sample-data preview{" "}
          <Link href="/setup">Connect your community ↗</Link>
        </div>
      )}
    </>
  )
}
