import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"
import {
  contentMedia,
  limit,
  member,
  optionalMember,
  publicMember,
  visiblePost,
} from "./access"
export const reserve = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await member(ctx, true)
    await limit(ctx, user._id, "upload", 15, 3600000)
    return user._id
  },
})
export const register = internalMutation({
  args: { storage: v.id("_storage"), mime: v.string(), size: v.number() },
  handler: async (ctx, args) => {
    const user = await member(ctx, true)
    return ctx.db.insert("media", { owner: user._id, ...args })
  },
})
export const accessible = internalQuery({
  args: {
    id: v.string(),
    post: v.optional(v.string()),
    profile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("media", args.id),
      file = id ? await ctx.db.get(id) : null
    if (!file) return null
    const owner = await ctx.db.get(file.owner)
    if (!owner || owner.suspended || owner.hidden) return null
    const viewer = await optionalMember(ctx)
    if (viewer?._id === file.owner && !viewer.suspended) return file
    if (args.post) {
      const postId = ctx.db.normalizeId("posts", args.post),
        post = postId ? await visiblePost(ctx, postId) : null
      if (post?.published && contentMedia(post.published).includes(file._id))
        return file
    }
    if (args.profile) {
      const profileId = ctx.db.normalizeId("members", args.profile),
        user = profileId ? await ctx.db.get(profileId) : null
      if (
        user &&
        publicMember(user) &&
        (user.avatar === file._id || user.cover === file._id)
      )
        return file
    }
    return null
  },
})
