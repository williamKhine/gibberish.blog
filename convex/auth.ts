import Google from "@auth/core/providers/google"
import { convexAuth } from "@convex-dev/auth/server"
import { normalizeEmail } from "../lib/password-auth"
import { limit } from "./access"
import type { MutationCtx } from "./_generated/server"
import { password } from "./password"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  callbacks: {
    async afterUserCreatedOrUpdated(
      ctx: MutationCtx,
      { type, provider, profile, userId }
    ) {
      // This runs in the same transaction that issues the code, before delivery.
      if (
        type === "email" &&
        (provider.id === "password-verify" || provider.id === "password-reset")
      ) {
        await limit(ctx, userId, "password-email", 5, 15 * 60_000)
        await limit(ctx, "all", "password-email", 30)
      }

      if (
        type === "oauth" &&
        provider.id === "google" &&
        profile.emailVerified &&
        typeof profile.email === "string"
      ) {
        // A pending password registration may precede the first Google sign-in.
        // Move only the unverified credential. It still requires its email code.
        const email = profile.email
        const account = await ctx.db
          .query("authAccounts")
          .withIndex("providerAndAccountId", (q) =>
            q.eq("provider", "password").eq("providerAccountId", email)
          )
          .unique()
        if (account && account.userId !== userId && !account.emailVerified) {
          const pendingUser = await ctx.db.get("users", account.userId)
          if (pendingUser && pendingUser.emailVerificationTime === undefined) {
            await ctx.db.patch("authAccounts", account._id, { userId })
          }
        }
      }
    },
  },
  providers: [
    Google({
      profile(profile) {
        if (!profile.email || profile.email_verified !== true)
          throw new Error("Google must verify your email before you can join.")

        return {
          id: profile.sub,
          email: normalizeEmail(profile.email),
          emailVerified: true,
          name: profile.name,
          image: profile.picture,
        }
      },
    }),
    password,
  ],
})
