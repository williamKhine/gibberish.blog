import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const content = v.object({
  title: v.string(),
  body: v.string(),
  excerpt: v.string(),
  tags: v.array(v.string()),
  cover: v.optional(v.id("media")),
})
export default defineSchema({
  ...authTables,
  members: defineTable({
    // Stable Convex Auth user ID, shared across the user’s sessions.
    subject: v.string(),
    approved: v.boolean(),
    suspended: v.boolean(),
    hidden: v.boolean(),
    handle: v.string(),
    name: v.string(),
    bio: v.string(),
    accent: v.string(),
    sticker: v.string(),
    avatar: v.optional(v.id("media")),
    cover: v.optional(v.id("media")),
  })
    .index("subject", ["subject"])
    .index("handle", ["handle"]),
  applications: defineTable({
    member: v.id("members"),
    introduction: v.string(),
    sample: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    reason: v.string(),
  })
    .index("member", ["member"])
    .index("status", ["status"]),
  posts: defineTable({
    author: v.id("members"),
    working: content,
    published: v.optional(content),
    slug: v.string(),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number(),
    revision: v.number(),
    removed: v.boolean(),
    commentsClosed: v.boolean(),
    searchText: v.string(),
  })
    .index("author", ["author"])
    .index("published", ["publishedAt"])
    .searchIndex("search", { searchField: "searchText" }),
  comments: defineTable({
    author: v.id("members"),
    post: v.id("posts"),
    parent: v.optional(v.id("comments")),
    text: v.string(),
    removed: v.boolean(),
    updatedAt: v.number(),
  })
    .index("post", ["post"])
    .index("parent", ["parent"]),
  follows: defineTable({
    member: v.id("members"),
    target: v.id("members"),
  }).index("pair", ["member", "target"]),
  bookmarks: defineTable({
    member: v.id("members"),
    post: v.id("posts"),
  }).index("pair", ["member", "post"]),
  reactions: defineTable({
    member: v.id("members"),
    post: v.id("posts"),
    emoji: v.string(),
  })
    .index("pair", ["member", "post"])
    .index("post", ["post"]),
  media: defineTable({
    owner: v.id("members"),
    storage: v.id("_storage"),
    mime: v.string(),
    size: v.number(),
  }).index("owner", ["owner"]),
  reports: defineTable({
    reporter: v.id("members"),
    kind: v.union(
      v.literal("post"),
      v.literal("comment"),
      v.literal("profile")
    ),
    target: v.string(),
    reason: v.string(),
    resolved: v.boolean(),
  }).index("resolved", ["resolved"]),
  moderation: defineTable({
    actor: v.string(),
    action: v.string(),
    target: v.string(),
    reason: v.string(),
  }),
  limits: defineTable({
    key: v.string(),
    start: v.number(),
    count: v.number(),
  }).index("key", ["key"]),
})
