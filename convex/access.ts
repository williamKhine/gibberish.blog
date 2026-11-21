import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import { mediaIds, parseBody } from "../lib/content"
export async function verifiedUserId(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx)
  const user = userId ? await ctx.db.get(userId) : null
  return user?.emailVerificationTime !== undefined ? user._id : null
}

export function findMember(ctx: QueryCtx, userId: Id<"users">) {
  return ctx.db
    .query("members")
    .withIndex("subject", (q) => q.eq("subject", userId))
    .unique()
}

export async function optionalMember(ctx: QueryCtx) {
  const userId = await verifiedUserId(ctx)
  return userId ? findMember(ctx, userId) : null
}

export async function member(ctx: QueryCtx, approved = false) {
  const userId = await verifiedUserId(ctx)
  if (!userId) throw new ConvexError("Sign in with a verified email.")
  const user = await findMember(ctx, userId)
  if (!user || user.suspended) throw new ConvexError("Account unavailable.")
  if (approved && !user.approved)
    throw new ConvexError("Writer approval required.")
  return user
}

export function isAdministrator(user: Doc<"members">) {
  return (
    !user.suspended &&
    (process.env.ADMIN_AUTH_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .includes(user.subject)
  )
}

export async function admin(ctx: QueryCtx) {
  const user = await member(ctx)
  if (!isAdministrator(user))
    throw new ConvexError("Administrator access required.")
  return user
}
export function publicMember(user: Doc<"members"> | null) {
  return !!user && user.approved && !user.suspended && !user.hidden
}
export function profile(user: Doc<"members">) {
  return {
    _id: user._id,
    handle: user.handle,
    name: user.name,
    bio: user.bio,
    accent: user.accent,
    sticker: user.sticker,
    avatar: user.avatar,
    cover: user.cover,
  }
}
export async function visiblePost(ctx: QueryCtx, id: Id<"posts">) {
  const post = await ctx.db.get(id)
  if (
    !post?.published ||
    post.removed ||
    !publicMember(await ctx.db.get(post.author))
  )
    return null
  return post
}
export async function limit(
  ctx: MutationCtx,
  user: string,
  action: string,
  max: number,
  window = 60_000
) {
  const key = `${user}:${action}`,
    now = Date.now()
  const bucket = await ctx.db
    .query("limits")
    .withIndex("key", (q) => q.eq("key", key))
    .unique()
  if (!bucket) {
    await ctx.db.insert("limits", { key, start: now, count: 1 })
    return
  }
  if (now - bucket.start >= window) {
    await ctx.db.patch(bucket._id, { start: now, count: 1 })
    return
  }
  if (bucket.count >= max)
    throw new ConvexError("Too many requests. Please try again later.")
  await ctx.db.patch(bucket._id, { count: bucket.count + 1 })
}
export async function ownsMedia(
  ctx: QueryCtx,
  owner: Id<"members">,
  ids: string[]
) {
  for (const raw of ids) {
    const id = ctx.db.normalizeId("media", raw)
    const file = id ? await ctx.db.get(id) : null
    if (!file || file.owner !== owner)
      throw new ConvexError("Image unavailable or owned by another member.")
  }
}
export function contentMedia(value: { body: string; cover?: Id<"media"> }) {
  return [
    ...mediaIds(parseBody(value.body)),
    ...(value.cover ? [value.cover] : []),
  ]
}
