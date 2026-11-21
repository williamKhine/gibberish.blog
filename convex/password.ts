import { Email } from "@convex-dev/auth/providers/Email"
import { Password } from "@convex-dev/auth/providers/Password"
import {
  maximumPasswordLength,
  minimumPasswordLength,
  normalizeEmail,
} from "../lib/password-auth"

function passwordEmail(purpose: "verify" | "reset") {
  return Email({
    id: `password-${purpose}`,
    maxAge: 15 * 60,
    async sendVerificationRequest({ identifier, token }) {
      const apiKey = process.env.AUTH_RESEND_KEY
      const from = process.env.AUTH_EMAIL_FROM
      const site = process.env.SITE_URL
      if (!apiKey || !from || !site)
        throw new Error("Auth email is not configured")

      const resetUrl = new URL("/sign-in?recover=finish", site)
      resetUrl.hash = new URLSearchParams({ reset: token }).toString()
      const subject =
        purpose === "verify"
          ? "Verify your Gibberish email"
          : "Reset your Gibberish password"
      const instructions =
        purpose === "verify"
          ? `Enter this code in the Gibberish form where you started signing up:\n\n${token}`
          : `Open this link and choose a new password:\n\n${resetUrl}`

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [identifier],
          subject,
          text: `${instructions}\n\nThis expires in 15 minutes. If you didn't request it, you can ignore this email.`,
        }),
      })
      if (!response.ok) throw new Error("Auth email could not be sent")
    },
  })
}

export const password = Password({
  verify: passwordEmail("verify"),
  reset: passwordEmail("reset"),
  profile({ email }) {
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      email !== normalizeEmail(email) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new Error("Invalid email address")
    }
    return { email }
  },
  validatePasswordRequirements(value) {
    if (
      typeof value !== "string" ||
      value.length < minimumPasswordLength ||
      value.length > maximumPasswordLength
    ) {
      throw new Error("Invalid password length")
    }
  },
})
