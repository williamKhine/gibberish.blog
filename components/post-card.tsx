import Link from "next/link"
import type { PublicPost } from "@/lib/demo"
import { Illustration } from "./illustration"
export function MediaImage({
  id,
  post,
  profile,
  alt,
  className,
}: {
  id: string
  post?: string
  profile?: string
  alt: string
  className?: string
}) {
  const params = new URLSearchParams({
    id,
    ...(post ? { post } : {}),
    ...(profile ? { profile } : {}),
  })
  return (
    <img
      className={className}
      src={`/api/media?${params}`}
      alt={alt}
      loading="lazy"
    />
  )
}
export function AuthorLine({ post }: { post: PublicPost }) {
  return (
    <div className="author-line">
      <Link
        href={`/u/${post.author.handle}`}
        className={`avatar accent-${post.author.accent}`}
      >
        {post.author.avatar ? (
          <MediaImage
            id={post.author.avatar}
            profile={post.author._id}
            alt=""
          />
        ) : (
          post.author.sticker
        )}
      </Link>
      <div>
        <Link href={`/u/${post.author.handle}`} className="author-name">
          {post.author.name}
        </Link>
        <span className="post-date">
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}{" "}
          · {Math.max(1, Math.ceil(post.body.length / 1700))} min of your life
        </span>
      </div>
    </div>
  )
}
export function PostCard({
  post,
  featured = false,
}: {
  post: PublicPost
  featured?: boolean
}) {
  return (
    <article className={`post-card ${featured ? "featured-card" : ""}`}>
      <Link
        href={`/p/${post._id}/${post.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="card-art"
      >
        {post.cover ? (
          <MediaImage id={post.cover} post={post._id} alt="" />
        ) : (
          <Illustration
            kind={post._id.startsWith("demo") ? post.slug : "internet"}
          />
        )}
      </Link>
      <div className="card-content">
        <div className="tags">
          {post.tags.map((t) => (
            <Link href={`/tags/${t}`} key={t}>
              #{t}
            </Link>
          ))}
        </div>
        <h2>
          <Link href={`/p/${post._id}/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <AuthorLine post={post} />
      </div>
    </article>
  )
}
