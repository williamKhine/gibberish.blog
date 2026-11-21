"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useState, type FormEvent } from "react"
import {
  maximumPasswordLength,
  minimumPasswordLength,
  normalizeEmail,
} from "@/lib/password-auth"
import { Button } from "./ui/button"

type Flow =
  "signIn" | "signUp" | "email-verification" | "reset" | "reset-verification"

const submitLabels: Record<Flow, string> = {
  signIn: "Sign in",
  signUp: "Create account",
  "email-verification": "Verify email",
  reset: "Send reset link",
  "reset-verification": "Set new password",
}

const errors: Record<Flow, string> = {
  signIn: "Couldn't sign in. Check your email and password and try again.",
  signUp:
    "Couldn't start sign-up. Try signing in or resetting your password if you already have an account.",
  "email-verification":
    "Couldn't verify this code. Try again or request a new code.",
  reset: "",
  "reset-verification":
    "Couldn't reset your password. Check your email address or request a new link.",
}

export function PasswordSignIn({
  mode,
  target,
}: {
  mode: Exclude<Flow, "email-verification">
  target: string
}) {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<Flow>(mode)
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [resetRequested, setResetRequested] = useState(false)

  const verification = flow === "email-verification"
  const settingPassword = flow === "signUp" || flow === "reset-verification"
  const showPassword = settingPassword || flow === "signIn"

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const address = normalizeEmail(email)
    const password = String(data.get("password") ?? "")
    const code =
      flow === "reset-verification"
        ? (new URLSearchParams(window.location.hash.slice(1)).get("reset") ??
          "")
        : String(data.get("code") ?? "").trim()

    if (flow === "reset-verification" && !code) {
      setError("Open the link from your password reset email.")
      return
    }

    setError("")
    setPending(true)
    try {
      const params = { email: address, flow }
      const { signingIn } = await signIn("password", {
        ...params,
        ...(showPassword && flow !== "reset-verification" ? { password } : {}),
        ...(verification ? { code } : {}),
        ...(flow === "reset-verification"
          ? { code, newPassword: password }
          : {}),
      })

      if (signingIn) {
        window.location.replace(target)
        return
      }

      if (flow === "signIn" || flow === "signUp") {
        setEmail(address)
        setFlow("email-verification")
      } else if (flow !== "reset") {
        setError(errors[flow])
      }
    } catch {
      if (flow !== "reset") setError(errors[flow])
    } finally {
      if (flow === "reset") setResetRequested(true)
      setPending(false)
    }
  }

  if (resetRequested) {
    return (
      <p role="status" className="panel">
        If there’s a password account for that address, you’ll receive a reset
        link.
      </p>
    )
  }

  return (
    <form className="panel" method="post" onSubmit={submit}>
      {verification && (
        <p role="status">Enter the verification code sent to {email}.</p>
      )}
      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          readOnly={verification}
          required
        />
      </label>
      {showPassword && (
        <label className="field">
          <span>
            {flow === "reset-verification" ? "New password" : "Password"}
          </span>
          <input
            name="password"
            type="password"
            autoComplete={settingPassword ? "new-password" : "current-password"}
            minLength={settingPassword ? minimumPasswordLength : undefined}
            maxLength={maximumPasswordLength}
            aria-describedby={
              settingPassword ? "password-requirement" : undefined
            }
            required
          />
          {settingPassword && (
            <span id="password-requirement">
              Use at least {minimumPasswordLength} characters.
            </span>
          )}
        </label>
      )}
      {verification && (
        <label className="field">
          <span>Verification code</span>
          <input
            name="code"
            autoComplete="one-time-code"
            spellCheck={false}
            required
          />
        </label>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="row">
        <Button type="submit" disabled={pending}>
          {pending ? "Please wait…" : submitLabels[flow]}
        </Button>
        {verification && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setError("")
              setFlow(mode)
            }}
          >
            Request a new code
          </Button>
        )}
      </div>
    </form>
  )
}
