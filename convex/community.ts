import { ConvexError } from "convex/values"
import { v } from "convex/values"
import { paginationOptsValidator } from "convex/server"
import { mutation, query } from "./_generated/server"
import { content } from "./schema"
import {
  contentMedia,
  limit,
  member,
  optionalMember,
  ownsMedia,
  profile,
  publicMember,
  visiblePost,
} from "./access"
import { EMPTY_BODY, parseBody, plainText, slugify } from "../lib/content"
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
export const apply = mutation({
  args: { introduction: v.string(), sample: v.string(), accepted: v.boolean() },
  handler: async (ctx, args) => {
    const user = await member(ctx)
    if (user.approved) throw new ConvexError("You are already approved.")
    if (
      !args.accepted ||
      args.introduction.trim().length < 20 ||
      args.introduction.length > 2000 ||
      args.sample.trim().length < 50 ||
      args.sample.length > 10000
    )
      throw new ConvexError(
        "Accept the rules and include an introduction (20–2,000 characters) and sample (50–10,000 characters)."
      )
    await limit(ctx, user._id, "apply", 3, 86400000)
    const existing = await ctx.db
      .query("applications")
      .withIndex("member", (q) => q.eq("member", user._id))
      .unique()
    if (existing?.status === "pending")
      throw new ConvexError("Your application is already in the queue.")
    const value = {
      member: user._id,
      introduction: args.introduction.trim(),
      sample: args.sample.trim(),
      status: "pending" as const,
      reason: "",
    }
    return existing
      ? ctx.db.replace(existing._id, value)
      : ctx.db.insert("applications", value)
  },
})
export const saveProfile = mutation({
  args: {
    handle: v.string(),
    name: v.string(),
    bio: v.string(),
    accent: v.string(),
    sticker: v.string(),
    avatar: v.optional(v.id("media")),
    cover: v.optional(v.id("media")),
  },
  handler: async (ctx, args) => {
    const user = await member(ctx, true)
    if (
      !/^[a-z0-9][a-z0-9-]{2,29}$/.test(args.handle) ||
      !args.name.trim() ||
      args.name.length > 60 ||
      args.bio.length > 400 ||
      !["yellow", "pink", "blue", "green"].includes(args.accent) ||
      !["✳", "✿", "★", "☻", "↗"].includes(args.sticker)
    )
      throw new ConvexError("Check your profile fields.")
    const existing = await ctx.db
      .query("members")
      .withIndex("handle", (q) => q.eq("handle", args.handle))
      .unique()
    if (existing && existing._id !== user._id)
      throw new ConvexError("That handle is taken.")
    await ownsMedia(
      ctx,
      user._id,
      [args.avatar, args.cover].filter(
        (id): id is NonNullable<typeof id> => !!id
      )
    )
    await limit(ctx, user._id, "profile", 10)
    await ctx.db.patch(user._id, args)
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
export const drafts = query({
  args: {},
  handler: async (ctx) => {
    const user = await member(ctx)
    return ctx.db
      .query("posts")
      .withIndex("author", (q) => q.eq("author", user._id))
      .order("desc")
      .collect()
  },
})
export const draft = query({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await member(ctx),
      post = await ctx.db.get(args.id)
    if (!post || post.author !== user._id)
      throw new ConvexError("Draft unavailable.")
    return post
  },
})
export const createDraft = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await member(ctx)
    await limit(ctx, user._id, "draft", 10)
    return ctx.db.insert("posts", {
      author: user._id,
      working: { title: "", body: EMPTY_BODY, excerpt: "", tags: [] },
      revision: 0,
      updatedAt: Date.now(),
      slug: "untitled",
      removed: false,
      commentsClosed: false,
      searchText: "",
    })
  },
})
export const saveDraft = mutation({
  args: { id: v.id("posts"), revision: v.number(), content },
  handler: async (ctx, args) => {
    const user = await member(ctx),
      post = await ctx.db.get(args.id)
    if (!post || post.author !== user._id)
      throw new ConvexError("Draft unavailable.")
    if (post.revision !== args.revision)
      throw new ConvexError(
        "This draft changed in another tab. Copy your text before reloading."
      )
    const c = args.content
    if (
      c.title.length > 180 ||
      c.excerpt.length > 300 ||
      c.tags.length > 5 ||
      c.tags.some((t) => !/^[a-z0-9-]{1,30}$/.test(t))
    )
      throw new ConvexError(
        "Use a title under 180 characters, a short excerpt, and up to five simple tags."
      )
    parseBody(c.body)
    await ownsMedia(ctx, user._id, contentMedia(c))
    await ctx.db.patch(post._id, {
      working: c,
      updatedAt: Date.now(),
      revision: post.revision + 1,
    })
    return post.revision + 1
  },
})
export const postAction = mutation({
  args: {
    id: v.id("posts"),
    action: v.union(
      v.literal("publish"),
      v.literal("unpublish"),
      v.literal("delete"),
      v.literal("comments")
    ),
  },
  handler: async (ctx, args) => {
    const user = await member(ctx, args.action === "publish"),
      post = await ctx.db.get(args.id)
    if (!post || post.author !== user._id)
      throw new ConvexError("Post unavailable.")
    if (args.action === "publish") {
      if (post.removed || user.hidden)
        throw new ConvexError("Moderated content cannot be republished.")
      if (
        !post.working.title.trim() ||
        !plainText(parseBody(post.working.body)).trim()
      )
        throw new ConvexError("Add a title and some words first.")
      await limit(ctx, user._id, "publish", 10)
      await ownsMedia(ctx, user._id, contentMedia(post.working))
      await ctx.db.patch(post._id, {
        published: post.working,
        publishedAt: post.publishedAt ?? Date.now(),
        slug: slugify(post.working.title),
        searchText: `${post.working.title} ${plainText(parseBody(post.working.body))}`,
      })
    } else if (args.action === "unpublish")
      await ctx.db.patch(post._id, {
        published: undefined,
        publishedAt: undefined,
        searchText: "",
      })
    else if (args.action === "comments")
      await ctx.db.patch(post._id, { commentsClosed: !post.commentsClosed })
    else {
      for (const table of ["comments", "bookmarks", "reactions"] as const) {
        const rows = await ctx.db
          .query(table)
          .filter((q) => q.eq(q.field("post"), post._id))
          .collect()
        for (const row of rows) await ctx.db.delete(row._id)
      }
      await ctx.db.delete(post._id)
    }
  },
})
