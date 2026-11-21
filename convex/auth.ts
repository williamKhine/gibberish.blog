import Google from "@auth/core/providers/google"
import { convexAuth } from "@convex-dev/auth/server"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      profile(profile) {
        if (!profile.email || profile.email_verified !== true)
          throw new Error("Google must verify your email before you can join.")

        return {
          id: profile.sub,
          email: profile.email,
          emailVerified: true,
          name: profile.name,
          image: profile.picture,
        }
      },
    }),
  ],
})
