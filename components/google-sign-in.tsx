"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useState } from "react"
import { Button } from "./ui/button"

export function GoogleSignIn({ redirectTo }: { redirectTo: string }) {
  const { signIn } = useAuthActions()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function startSignIn() {
    setError("")
    setPending(true)
    try {
      await signIn("google", { redirectTo })
    } catch {
      setError("Google sign-in couldn’t start. Please try again.")
      setPending(false)
    }
  }

  return (
    <>
      <Button onClick={startSignIn} disabled={pending}>
        {pending ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  )
}
