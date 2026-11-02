import { ConvexError } from "convex/values"
import { v } from "convex/values"
import { paginationOptsValidator } from "convex/server"
import { mutation, query } from "./_generated/server"
import { content } from "./schema"
import {
  admin,
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
export const social = query({
  args: { post: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await visiblePost(ctx, args.post)
    if (!post) return null
    const user = await optionalMember(ctx)
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("post", (q) => q.eq("post", args.post))
      .collect()
    const counts: Record<string, number> = {}
    for (const reaction of reactions) {
      const by = await ctx.db.get(reaction.member)
      if (by && !by.suspended)
        counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1
    }
    return {
      counts: Object.entries(counts).map(([emoji, count]) => ({
        emoji,
        count,
      })),
      mine: reactions.find((r) => r.member === user?._id)?.emoji,
      bookmarked:
        !!user &&
        !!(await ctx.db
          .query("bookmarks")
          .withIndex("pair", (q) =>
            q.eq("member", user._id).eq("post", args.post)
          )
          .unique()),
      following:
        !!user &&
        !!(await ctx.db
          .query("follows")
          .withIndex("pair", (q) =>
            q.eq("member", user._id).eq("target", post.author)
          )
          .unique()),
    }
  },
})
export const interact = mutation({
  args: {
    post: v.id("posts"),
    action: v.union(
      v.literal("bookmark"),
      v.literal("follow"),
      v.literal("reaction")
    ),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await member(ctx),
      post = await visiblePost(ctx, args.post)
    if (!post) throw new ConvexError("Post unavailable.")
    await limit(ctx, user._id, "interact", 60)
    if (args.action === "follow") {
      if (user._id === post.author)
        throw new ConvexError("You cannot follow yourself.")
      const row = await ctx.db
        .query("follows")
        .withIndex("pair", (q) =>
          q.eq("member", user._id).eq("target", post.author)
        )
        .unique()
      if (row) await ctx.db.delete(row._id)
      else
        await ctx.db.insert("follows", {
          member: user._id,
          target: post.author,
        })
    } else if (args.action === "bookmark") {
      const row = await ctx.db
        .query("bookmarks")
        .withIndex("pair", (q) => q.eq("member", user._id).eq("post", post._id))
        .unique()
      if (row) await ctx.db.delete(row._id)
      else
        await ctx.db.insert("bookmarks", { member: user._id, post: post._id })
    } else {
      if (!["💛", "😂", "🤯", "✨"].includes(args.emoji ?? ""))
        throw new ConvexError("Choose a supported reaction.")
      const row = await ctx.db
        .query("reactions")
        .withIndex("pair", (q) => q.eq("member", user._id).eq("post", post._id))
        .unique()
      if (row) {
        if (row.emoji === args.emoji) await ctx.db.delete(row._id)
        else await ctx.db.patch(row._id, { emoji: args.emoji! })
      } else
        await ctx.db.insert("reactions", {
          member: user._id,
          post: post._id,
          emoji: args.emoji!,
        })
    }
  },
})
export const comments = query({
  args: { post: v.id("posts"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    if (!(await visiblePost(ctx, args.post)))
      return { page: [], isDone: true, continueCursor: "" }
    const result = await ctx.db
      .query("comments")
      .withIndex("post", (q) => q.eq("post", args.post))
      .order("asc")
      .paginate(args.paginationOpts)
    const page = []
    for (const c of result.page) {
      const author = await ctx.db.get(c.author)
      if (c.removed || !author || !publicMember(author)) continue
      page.push({ ...c, author: profile(author) })
    }
    return { ...result, page }
  },
})
export const comment = mutation({
  args: {
    post: v.id("posts"),
    text: v.string(),
    parent: v.optional(v.id("comments")),
    id: v.optional(v.id("comments")),
    remove: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await member(ctx, true),
      post = await visiblePost(ctx, args.post)
    if (!post) throw new ConvexError("Post unavailable.")
    if (args.id) {
      const row = await ctx.db.get(args.id)
      if (
        !row ||
        row.author !== user._id ||
        row.post !== args.post ||
        row.removed
      )
        throw new ConvexError("Comment unavailable.")
      if (args.remove) {
        await ctx.db.patch(row._id, { removed: true, text: "" })
        return
      }
    }
    if (post.commentsClosed) throw new ConvexError("Comments are closed.")
    if (!args.text.trim() || args.text.length > 2000)
      throw new ConvexError("Comments must be 1–2,000 characters.")
    if (args.parent) {
      const parent = await ctx.db.get(args.parent)
      if (
        !parent ||
        parent.post !== post._id ||
        parent.parent ||
        parent.removed ||
        !publicMember(await ctx.db.get(parent.author))
      )
        throw new ConvexError("Reply unavailable.")
    }
    await limit(ctx, user._id, "comment", 10)
    if (args.id)
      await ctx.db.patch(args.id, {
        text: args.text.trim(),
        updatedAt: Date.now(),
      })
    else
      return await ctx.db.insert("comments", {
        post: args.post,
        author: user._id,
        parent: args.parent,
        text: args.text.trim(),
        removed: false,
        updatedAt: Date.now(),
      })
  },
})
export const report = mutation({
  args: {
    kind: v.union(
      v.literal("post"),
      v.literal("comment"),
      v.literal("profile")
    ),
    target: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await member(ctx)
    if (args.reason.trim().length < 10 || args.reason.length > 2000)
      throw new ConvexError("Please describe the issue in 10–2,000 characters.")
    let available = false
    if (args.kind === "post") {
      const id = ctx.db.normalizeId("posts", args.target)
      available = !!id && !!(await visiblePost(ctx, id))
    } else if (args.kind === "profile") {
      const id = ctx.db.normalizeId("members", args.target)
      available = !!id && publicMember(await ctx.db.get(id))
    } else {
      const id = ctx.db.normalizeId("comments", args.target)
      const row = id ? await ctx.db.get(id) : null
      available =
        !!row &&
        !row.removed &&
        publicMember(await ctx.db.get(row.author)) &&
        !!(await visiblePost(ctx, row.post))
    }
    if (!available) throw new ConvexError("Content unavailable.")
    await limit(ctx, user._id, "report", 5, 3600000)
    await ctx.db.insert("reports", {
      ...args,
      reporter: user._id,
      resolved: false,
    })
  },
})
export const adminQueue = query({
  args: {},
  handler: async (ctx) => {
    await admin(ctx)
    const reports = await ctx.db
      .query("reports")
      .withIndex("resolved", (q) => q.eq("resolved", false))
      .collect()
    const enriched = await Promise.all(
      reports.map(async (report) => {
        let text = "Content has been deleted.",
          author: string | undefined,
          href: string | undefined
        if (report.kind === "post") {
          const id = ctx.db.normalizeId("posts", report.target)
          const post = id ? await ctx.db.get(id) : null
          if (post) {
            author = post.author
            text = post.published
              ? `${post.published.title}\n\n${plainText(parseBody(post.published.body))}`
              : "Post is no longer published."
            href = `/p/${post._id}/${post.slug}`
          }
        } else if (report.kind === "comment") {
          const id = ctx.db.normalizeId("comments", report.target)
          const comment = id ? await ctx.db.get(id) : null
          if (comment) {
            author = comment.author
            text = comment.removed ? "Comment has been removed." : comment.text
            const post = await ctx.db.get(comment.post)
            if (post)
              href = `/p/${post._id}/${post.slug}#comment-${comment._id}`
          }
        } else {
          const id = ctx.db.normalizeId("members", report.target)
          const user = id ? await ctx.db.get(id) : null
          if (user) {
            author = user._id
            text = `${user.name} (@${user.handle})\n${user.bio}`
            href = `/u/${user.handle}`
          }
        }
        return { ...report, text, author, href }
      })
    )
    return {
      applications: await ctx.db
        .query("applications")
        .withIndex("status", (q) => q.eq("status", "pending"))
        .collect(),
      reports: enriched,
      members: await ctx.db.query("members").order("desc").take(100),
      audit: await ctx.db.query("moderation").order("desc").take(50),
    }
  },
})
export const moderate = mutation({
  args: {
    action: v.union(
      v.literal("approve"),
      v.literal("reject"),
      v.literal("suspend"),
      v.literal("reinstate"),
      v.literal("hide-profile"),
      v.literal("show-profile"),
      v.literal("remove-post"),
      v.literal("remove-comment"),
      v.literal("resolve")
    ),
    target: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await admin(ctx)
    if (args.reason.trim().length < 3 || args.reason.length > 2000)
      throw new ConvexError("Include a moderation reason.")
    if (args.action === "approve" || args.action === "reject") {
      const id = ctx.db.normalizeId("applications", args.target),
        application = id ? await ctx.db.get(id) : null
      if (!application || application.status !== "pending")
        throw new ConvexError("Application is no longer pending.")
      await ctx.db.patch(application._id, {
        status: args.action === "approve" ? "approved" : "rejected",
        reason: args.reason,
      })
      if (args.action === "approve")
        await ctx.db.patch(application.member, { approved: true })
    } else if (
      ["suspend", "reinstate", "hide-profile", "show-profile"].includes(
        args.action
      )
    ) {
      const id = ctx.db.normalizeId("members", args.target)
      if (!id || !(await ctx.db.get(id)) || id === actor._id)
        throw new ConvexError(
          "Member unavailable or action targets your own account."
        )
      await ctx.db.patch(
        id,
        args.action.includes("profile")
          ? { hidden: args.action === "hide-profile" }
          : { suspended: args.action === "suspend" }
      )
    } else if (args.action === "remove-post") {
      const id = ctx.db.normalizeId("posts", args.target)
      if (!id || !(await ctx.db.get(id)))
        throw new ConvexError("Post unavailable.")
      await ctx.db.patch(id, { removed: true, searchText: "" })
    } else if (args.action === "remove-comment") {
      const id = ctx.db.normalizeId("comments", args.target)
      if (!id || !(await ctx.db.get(id)))
        throw new ConvexError("Comment unavailable.")
      await ctx.db.patch(id, { removed: true, text: "" })
    } else {
      const id = ctx.db.normalizeId("reports", args.target)
      if (!id || !(await ctx.db.get(id)))
        throw new ConvexError("Report unavailable.")
      await ctx.db.patch(id, { resolved: true })
    }
    await ctx.db.insert("moderation", { actor: actor.subject, ...args })
  },
})
export const following = query({
  args: { target: v.id("members") },
  handler: async (ctx, args) => {
    const user = await optionalMember(ctx)
    return (
      !!user &&
      !user.suspended &&
      !!(await ctx.db
        .query("follows")
        .withIndex("pair", (q) =>
          q.eq("member", user._id).eq("target", args.target)
        )
        .unique())
    )
  },
})
export const toggleFollow = mutation({
  args: { target: v.id("members") },
  handler: async (ctx, args) => {
    const user = await member(ctx)
    const target = await ctx.db.get(args.target)
    if (!publicMember(target) || user._id === args.target)
      throw new ConvexError("Cannot follow this member.")
    await limit(ctx, user._id, "interact", 60)
    const row = await ctx.db
      .query("follows")
      .withIndex("pair", (q) =>
        q.eq("member", user._id).eq("target", args.target)
      )
      .unique()
    if (row) await ctx.db.delete(row._id)
    else
      await ctx.db.insert("follows", { member: user._id, target: args.target })
  },
})
