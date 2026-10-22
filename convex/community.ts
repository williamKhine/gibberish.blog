import { ConvexError } from "convex/values"
import { v } from "convex/values"
import { paginationOptsValidator } from "convex/server"
import { mutation, query } from "./_generated/server"
import {
  member,
  optionalMember,
  profile,
  publicMember,
  visiblePost,
} from "./access"
import type { Doc } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"

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
export const getProfile = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const user = await ctx.db
      .query("members")
      .withIndex("handle", (q) => q.eq("handle", handle))
      .unique()
    return user && publicMember(user) ? profile(user) : null
  },
})
async function card(ctx: QueryCtx, post: Doc<"posts">) {
  const author = await ctx.db.get(post.author)
  if (!post.published || post.removed || !author || !publicMember(author))
    return null
  return {
    _id: post._id,
    slug: post.slug,
    publishedAt: post.publishedAt!,
    commentsClosed: post.commentsClosed,
    ...post.published,
    author: profile(author),
  }
}
export const feed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    mode: v.optional(
      v.union(
        v.literal("latest"),
        v.literal("following"),
        v.literal("bookmarks")
      )
    ),
    tag: v.optional(v.string()),
    search: v.optional(v.string()),
    handle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = args.mode && args.mode !== "latest" ? await member(ctx) : null
    const result = args.search?.trim()
      ? await ctx.db
          .query("posts")
          .withSearchIndex("search", (q) =>
            q.search("searchText", args.search!.slice(0, 200))
          )
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("posts")
          .withIndex("published", (q) => q.gt("publishedAt", 0))
          .order("desc")
          .paginate(args.paginationOpts)
    const page = []
    for (const post of result.page) {
      const value = await card(ctx, post)
      if (
        !value ||
        (args.tag && !value.tags.includes(args.tag)) ||
        (args.handle && value.author.handle !== args.handle)
      )
        continue
      if (
        user &&
        args.mode === "following" &&
        !(await ctx.db
          .query("follows")
          .withIndex("pair", (q) =>
            q.eq("member", user._id).eq("target", post.author)
          )
          .unique())
      )
        continue
      if (
        user &&
        args.mode === "bookmarks" &&
        !(await ctx.db
          .query("bookmarks")
          .withIndex("pair", (q) =>
            q.eq("member", user._id).eq("post", post._id)
          )
          .unique())
      )
        continue
      page.push(value)
    }
    return { ...result, page }
  },
})
export const getPost = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("posts", args.id)
    const post = id ? await visiblePost(ctx, id) : null
    return post ? card(ctx, post) : null
  },
})
