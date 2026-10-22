"use client"
import { usePaginatedQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { configured } from "@/lib/config"
import { demoPosts, type PublicPost } from "@/lib/demo"
import { PostCard } from "./post-card"
import { Button } from "./ui/button"
export type FeedProps = {
  mode?: "latest" | "following" | "bookmarks"
  tag?: string
  search?: string
  handle?: string
  initial?: PublicPost[]
}
function Cards({ posts }: { posts: PublicPost[] }) {
  return (
    <div className="post-grid">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} />
      ))}
    </div>
  )
}
function LiveFeed({ initial, ...props }: FeedProps) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.community.feed,
    props,
    { initialNumItems: 12 }
  )
  const posts = status === "LoadingFirstPage" ? (initial ?? []) : results
  return (
    <>
      <Cards posts={posts} />
      {status === "LoadingFirstPage" && !posts.length && (
        <p className="empty-state" role="status">
          Finding the good stuff…
        </p>
      )}
      {status === "Exhausted" && !posts.length && (
        <p className="empty-state">
          Nothing here yet. A perfectly good place to start.
        </p>
      )}
      {status !== "Exhausted" && status !== "LoadingFirstPage" && (
        <Button
          className="load-more"
          size="lg"
          variant="outline"
          disabled={status === "LoadingMore"}
          onClick={() => loadMore(12)}
        >
          {status === "LoadingMore" ? "Loading…" : "A little more, please ↓"}
        </Button>
      )}
    </>
  )
}
export function Feed(props: FeedProps) {
  if (configured) return <LiveFeed {...props} />
  const posts = demoPosts.filter(
    (p) =>
      (!props.tag || p.tags.includes(props.tag)) &&
      (!props.handle || p.author.handle === props.handle) &&
      (!props.search ||
        `${p.title} ${p.excerpt}`
          .toLowerCase()
          .includes(props.search.toLowerCase()))
  )
  return posts.length ? (
    <Cards posts={posts} />
  ) : (
    <p className="empty-state">No little wonders found. Try another search.</p>
  )
}
