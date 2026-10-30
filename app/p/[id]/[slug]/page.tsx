import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { publicPost } from "@/lib/server"
import { AuthorLine, MediaImage } from "@/components/post-card"
import { RichBody } from "@/components/rich-body"
import { Social } from "@/components/social"
export const dynamic = "force-dynamic"
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}): Promise<Metadata> {
  const p = await publicPost((await params).id)
  return p
    ? {
        title: p.title,
        description: p.excerpt,
        alternates: { canonical: `/p/${p._id}/${p.slug}` },
        openGraph: {
          type: "article",
          title: p.title,
          description: p.excerpt,
          publishedTime: new Date(p.publishedAt).toISOString(),
          authors: [p.author.name],
        },
      }
    : { title: "Post not found" }
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  const { id, slug } = await params
  const p = await publicPost(id)
  if (!p) notFound()
  if (slug !== p.slug) redirect(`/p/${p._id}/${p.slug}`)
  return (
    <article className="article">
      <Link href="/" className="subtle-link">
        ← Back to the good stuff
      </Link>
      <div className="tags mt-8">
        {p.tags.map((t) => (
          <Link href={`/tags/${t}`} key={t}>
            #{t}
          </Link>
        ))}
      </div>
      <h1>{p.title}</h1>
      <p className="intro">{p.excerpt}</p>
      <AuthorLine post={p} />
      {p.cover && (
        <MediaImage
          className="article-cover"
          id={p.cover}
          post={p._id}
          alt="Post cover"
        />
      )}
      <RichBody body={p.body} post={p._id} />
      <Social post={p._id} closed={p.commentsClosed} />
    </article>
  )
}
