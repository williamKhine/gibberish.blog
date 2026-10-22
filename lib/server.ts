import "server-only"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { configured } from "./config"
import { demoPosts, type PublicPost } from "./demo"
export async function publicPost(id: string): Promise<PublicPost | null> {
  return configured
    ? fetchQuery(api.community.getPost, { id })
    : (demoPosts.find((p) => p._id === id) ?? null)
}
export async function publicFeed(): Promise<PublicPost[]> {
  return configured
    ? (
        await fetchQuery(api.community.feed, {
          paginationOpts: { numItems: 24, cursor: null },
        })
      ).page
    : demoPosts
}
export async function allPublicPosts(): Promise<PublicPost[]> {
  if (!configured) return []
  const posts: PublicPost[] = []
  let cursor: string | null = null
  do {
    const result: {
      page: PublicPost[]
      isDone: boolean
      continueCursor: string
    } = await fetchQuery(api.community.feed, {
      paginationOpts: { numItems: 100, cursor },
    })
    posts.push(...result.page)
    if (result.isDone) break
    cursor = result.continueCursor
  } while (cursor)
  return posts
}
