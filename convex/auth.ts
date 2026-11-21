import { convexAuth } from "@convex-dev/auth/server"
import { limit } from "./access"
import type { MutationCtx } from "./_generated/server"
import { password } from "./password"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  callbacks: {
    async afterUserCreatedOrUpdated(
      ctx: MutationCtx,
      { type, provider, userId }
    ) {
      // This runs in the same transaction that issues the code, before delivery.
      if (
        type === "email" &&
        (provider.id === "password-verify" || provider.id === "password-reset")
      ) {
        await limit(ctx, userId, "password-email", 5, 15 * 60_000)
        await limit(ctx, "all", "password-email", 30)
      }
    },
  },
  providers: [password],
})
