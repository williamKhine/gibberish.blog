import { ConvexError } from "convex/values"
import { mutation, query } from "./_generated/server"
import { optionalMember } from "./access"

export const ensureMember = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.emailVerified !== true)
      throw new ConvexError("Please verify your email first.")
    const existing = await optionalMember(ctx)
    if (existing) return existing._id
    // Convex seeds Math.random for deterministic transaction retries.
    let handle: string
    do {
      handle = `reader-${Math.random().toString(36).slice(2, 12)}`
    } while (
      await ctx.db
        .query("members")
        .withIndex("handle", (q) => q.eq("handle", handle))
        .first()
    )
    return ctx.db.insert("members", {
      subject: identity.subject,
      approved: false,
      suspended: false,
      hidden: false,
      handle,
      name: "A little mystery",
      bio: "",
      accent: "yellow",
      sticker: "✳",
    })
  },
})
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalMember(ctx)
    if (!user) return null
    const application = await ctx.db
      .query("applications")
      .withIndex("member", (q) => q.eq("member", user._id))
      .unique()
    return {
      ...user,
      application,
      isAdmin:
        !user.suspended &&
        (process.env.ADMIN_CLERK_IDS ?? "")
          .split(",")
          .map((s) => s.trim())
          .includes(user.subject),
    }
  },
})
